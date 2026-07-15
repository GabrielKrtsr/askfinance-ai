"""Orchestrateur non-streaming du copilote IA.

Déroulé commun :
1. assemble le system prompt (socle commun + persona) ;
2. réinjecte l'historique récent (mémoire multi-tours) ;
3. laisse Gemini choisir les outils (classification d'intention via function-calling) ;
4. exécute les outils, renvoie leurs résultats au modèle ;
5. recommence jusqu'à la réponse finale (borné par MAX_TOOL_ROUNDS).
"""
from __future__ import annotations

import json
import re
import unicodedata
from decimal import Decimal, InvalidOperation

from services.ai.gemini_client import (
    function_result_item,
    history_item,
    run_interaction,
    user_input_item,
)
from services.ai.personas import normalize_persona
from services.ai.language import normalize_language
from services.ai.prompts import build_system_prompt
from services.ai.tools import (
    app_today,
    run_tool,
    tool_declarations_for,
)

MAX_TOOL_ROUNDS = 4

_MONTH_ALIASES = {
    "janvier": 1,
    "fevrier": 2,
    "mars": 3,
    "avril": 4,
    "mai": 5,
    "juin": 6,
    "juillet": 7,
    "aout": 8,
    "septembre": 9,
    "octobre": 10,
    "novembre": 11,
    "decembre": 12,
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
    "січень": 1,
    "січня": 1,
    "січні": 1,
    "лютий": 2,
    "лютого": 2,
    "лютому": 2,
    "березень": 3,
    "березня": 3,
    "березні": 3,
    "квітень": 4,
    "квітня": 4,
    "квітні": 4,
    "травень": 5,
    "травня": 5,
    "травні": 5,
    "червень": 6,
    "червня": 6,
    "червні": 6,
    "липень": 7,
    "липня": 7,
    "липні": 7,
    "серпень": 8,
    "серпня": 8,
    "серпні": 8,
    "вересень": 9,
    "вересня": 9,
    "вересні": 9,
    "жовтень": 10,
    "жовтня": 10,
    "жовтні": 10,
    "листопад": 11,
    "листопада": 11,
    "листопаді": 11,
    "грудень": 12,
    "грудня": 12,
    "грудні": 12,
}

_MONTH_NAMES = {
    "fr": ("", "janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"),
    "en": ("", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"),
    "uk": ("", "січень", "лютий", "березень", "квітень", "травень", "червень", "липень", "серпень", "вересень", "жовтень", "листопад", "грудень"),
}

_CATEGORY_TRANSLATIONS = {
    "en": {
        "logement et immobilier": "Housing and real estate",
        "alimentation": "Food and groceries",
        "shopping et services": "Shopping and services",
        "transport": "Transport",
        "sante et bien etre": "Health and wellness",
        "banque et assurances": "Banking and insurance",
        "telephonie et internet": "Phone and internet",
        "loisirs et vacances": "Leisure and holidays",
        "non categorise": "Uncategorised",
    },
    "uk": {
        "logement et immobilier": "Житло та нерухомість",
        "alimentation": "Продукти та харчування",
        "shopping et services": "Покупки та послуги",
        "transport": "Транспорт",
        "sante et bien etre": "Здоров’я та добробут",
        "banque et assurances": "Банки та страхування",
        "telephonie et internet": "Телефон та інтернет",
        "loisirs et vacances": "Дозвілля та відпустка",
        "non categorise": "Без категорії",
    },
}


def _plain_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value.casefold())
    return "".join(char for char in normalized if not unicodedata.combining(char))


def _accepted_spending_month(
    message: str,
    history: list[dict] | None = None,
    pending_action: dict | None = None,
) -> str | None:
    """Résout une période depuis la demande ou une action structurée en attente.

    `history` est conservé dans la signature pour compatibilité, mais le texte
    rédigé par le modèle n'est volontairement plus parsé pour piloter un outil.
    """
    del history
    answer = re.sub(r"[^\w]+", " ", _plain_text(message), flags=re.UNICODE).strip()
    spending_intent = (
        ("ou part" in answer and "argent" in answer)
        or "depens" in answer
        or ("where" in answer and "money" in answer and "go" in answer)
        or "spending" in answer
        or "expense" in answer
        or ("куди" in answer and "грош" in answer)
        or "витрат" in answer
    )

    current_month_markers = ("ce mois", "this month", "цього місяця", "поточному місяці")
    if spending_intent and any(marker in answer for marker in current_month_markers):
        return app_today().strftime("%Y-%m")

    current_matches = list(
        re.finditer(
            r"\b(" + "|".join(re.escape(month) for month in _MONTH_ALIASES) + r")\b(?:\s+(20\d{2}))?",
            answer,
        )
    )
    pending_arguments = (pending_action or {}).get("arguments") or {}
    pending_month = str(pending_arguments.get("month") or "")
    pending_is_spending = (
        (pending_action or {}).get("type") == "tool_confirmation"
        and (pending_action or {}).get("tool") == "get_spending_by_category"
        and re.fullmatch(r"20\d{2}-\d{2}", pending_month) is not None
    )

    if current_matches and (
        spending_intent
        or pending_is_spending
        or any(word in answer for word in ("analys", "argent", "prend", "mois", "money", "spend", "expense", "month", "грош", "витрат", "місяц", "аналіз"))
    ):
        requested = current_matches[-1]
        requested_month = requested.group(1)
        requested_year = requested.group(2)
        month_number = _MONTH_ALIASES[requested_month]
        if requested_year is None:
            if pending_is_spending:
                requested_year = pending_month[:4]
            else:
                today = app_today()
                requested_year = str(today.year if month_number <= today.month else today.year - 1)
        return f"{int(requested_year):04d}-{month_number:02d}"

    short_confirmation = answer in {
        "oui",
        "oui bien sur",
        "d accord",
        "ok",
        "okay",
        "vas y",
        "je veux bien",
        "yes",
        "yes please",
        "sure",
        "go ahead",
        "так",
        "так будь ласка",
        "добре",
        "гаразд",
        "давай",
    }
    return pending_month if short_confirmation and pending_is_spending else None


def _is_declined_pending_action(message: str, pending_action: dict | None) -> bool:
    if not pending_action:
        return False
    answer = re.sub(r"[^\w]+", " ", _plain_text(message), flags=re.UNICODE).strip()
    return answer in {
        "non", "non merci", "pas maintenant", "laisse tomber", "annule",
        "no", "no thanks", "not now", "cancel",
        "ні", "ні дякую", "не зараз", "скасувати",
    }


def _verified_spending_followup(
    workspace_id: str,
    message: str,
    pending_action: dict | None,
) -> dict | None:
    if _is_declined_pending_action(message, pending_action):
        return {"declined": True}
    month = _accepted_spending_month(message, pending_action=pending_action)
    if month is None:
        return None
    result = run_tool(
        "get_spending_by_category",
        workspace_id,
        {"period": "specific_month", "month": month, "limit": 8},
    )
    return {"month": month, "result": result}


def _next_pending_action(context: dict) -> dict | None:
    if context.get("declined"):
        return None
    result = context.get("result") or {}
    requested_month = str(context.get("month") or "")
    latest = str(result.get("derniere_periode_disponible") or "")
    if result.get("donnees_disponibles") or not latest or latest == requested_month:
        return None
    return {
        "type": "tool_confirmation",
        "tool": "get_spending_by_category",
        "arguments": {"period": "specific_month", "month": latest, "limit": 8},
    }


def _localized_amount(value: object, language: str) -> str:
    raw = str(value or "").replace("EUR", "").replace("€", "").strip()
    try:
        amount = Decimal(raw.replace(" ", "").replace(",", "."))
    except (InvalidOperation, ValueError):
        return str(value or "")
    if language == "en":
        return f"€{amount:,.2f}"
    formatted = f"{amount:,.2f}".replace(",", " ").replace(".", ",")
    return f"{formatted} €"


def _localized_category(value: object, language: str) -> str:
    category = str(value or "")
    return _CATEGORY_TRANSLATIONS.get(language, {}).get(_plain_text(category), category)


def _month_label(value: str, language: str) -> str:
    year, month_number = value.split("-")
    return f"{_MONTH_NAMES[language][int(month_number)]} {year}"


def _format_verified_spending(context: dict, language: str = "fr") -> str:
    """Produit la réponse factuelle sans redonner les chiffres au modèle."""
    language = normalize_language(language)
    if context.get("declined"):
        return {
            "fr": "D'accord. Je n'analyse pas cette période.",
            "en": "Okay. I won’t analyse that period.",
            "uk": "Добре. Я не аналізуватиму цей період.",
        }[language]
    month = str(context["month"])
    result = context["result"]
    label = _month_label(month, language)

    if result.get("statut") == "erreur_outil":
        return {
            "fr": f"Je n'ai pas pu accéder à vos dépenses de {label} à cause d'une erreur technique. Aucun montant ne sera affiché tant que les données ne sont pas vérifiées. Réessayez dans un instant.",
            "en": f"I couldn’t access your spending for {label} because of a technical error. No amount will be shown until the data has been verified. Please try again shortly.",
            "uk": f"Не вдалося отримати витрати за {label} через технічну помилку. Суми не відображатимуться, доки дані не буде перевірено. Спробуйте ще раз трохи пізніше.",
        }[language]

    if not result.get("donnees_disponibles"):
        latest = result.get("derniere_periode_disponible")
        latest_text = ""
        if latest and latest != month:
            latest_label = _month_label(str(latest), language)
            latest_text = {
                "fr": f" Le dernier mois disponible est {latest_label}. Souhaitez-vous que je l'analyse ?",
                "en": f" The latest available month is {latest_label}. Would you like me to analyse it?",
                "uk": f" Останній доступний місяць — {latest_label}. Проаналізувати його?",
            }[language]
        return {
            "fr": f"Je n'ai aucune dépense enregistrée pour {label}.{latest_text}",
            "en": f"I have no recorded spending for {label}.{latest_text}",
            "uk": f"За {label} немає зареєстрованих витрат.{latest_text}",
        }[language]

    total = _localized_amount(result.get("total_depenses"), language)
    lines = [{
        "fr": f"Pour **{label}**, vos dépenses totalisent **{total}**.",
        "en": f"In **{label}**, you spent a total of **{total}**.",
        "uk": f"За **{label} року** ви витратили загалом **{total}**.",
    }[language], ""]
    for row in result.get("depenses_par_categorie") or []:
        amount = _localized_amount(row.get("montant"), language)
        category = _localized_category(row.get("categorie"), language)
        lines.append(f"- **{category}**: {amount}")
    return "\n".join(lines)


def answer_financial_question(
    workspace_id: str,
    message: str,
    persona_id: str,
    history: list[dict] | None = None,
    workspace_type: str = "business",
    pending_action: dict | None = None,
    language: str = "fr",
) -> dict:
    """Applique le persona et exécute la boucle d'outils non-streaming."""
    persona = normalize_persona(persona_id)
    language = normalize_language(language)
    system = build_system_prompt(persona, workspace_type, language)
    history = history or []
    verified_followup = _verified_spending_followup(
        workspace_id, message, pending_action
    )
    if verified_followup is not None:
        return {
            "answer": _format_verified_spending(verified_followup, language),
            "advisor": persona,
            "pending_action": _next_pending_action(verified_followup),
        }

    answer = _run_agent_loop(workspace_id, message, system, history, workspace_type, language)
    return {"answer": answer, "advisor": persona, "pending_action": None}


def _history_items(history: list[dict]) -> list[dict]:
    """Convertit les tours stockés en items d'entrée pour l'Interactions API."""
    return [
        history_item(str(turn.get("role", "user")), str(turn.get("content", "")))
        for turn in history
        if turn.get("content")
    ]


def _run_agent_loop(
    workspace_id: str,
    message: str,
    system: str,
    history: list[dict],
    workspace_type: str,
    language: str = "fr",
) -> str:
    """Boucle stateless : chaque tour retransmet appels et résultats d'outils."""
    input_items = _history_items(history) + [user_input_item(message)]
    tool_declarations = tool_declarations_for(workspace_type)

    for _ in range(MAX_TOOL_ROUNDS):
        result = run_interaction(system, input_items, tools=tool_declarations)
        calls = result.get("function_calls") or []
        if not calls:
            return result.get("text") or _empty_answer(language)

        tool_results = [
            function_result_item(
                call["id"],
                call["name"],
                json.dumps(run_tool(call["name"], workspace_id, call.get("arguments")), ensure_ascii=False),
            )
            for call in calls
        ]
        # Le modèle a besoin de revoir ses function_call avant les
        # function_result correspondants puisque store=false.
        input_items = [*input_items, *(result.get("steps") or []), *tool_results]

    result = run_interaction(system, input_items, tools=None)
    return result.get("text") or _empty_answer(language)


def _empty_answer(language: str = "fr") -> str:
    return {
        "fr": "Je n'ai pas pu produire de réponse exploitable pour le moment. Pouvez-vous reformuler ?",
        "en": "I couldn’t produce a useful answer just now. Could you rephrase your question?",
        "uk": "Зараз не вдалося сформувати корисну відповідь. Спробуйте переформулювати запитання.",
    }[normalize_language(language)]
