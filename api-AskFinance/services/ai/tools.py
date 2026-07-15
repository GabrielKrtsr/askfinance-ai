"""Outils du copilote IA : adaptateurs fins au-dessus des services métier.

Chaque outil renvoie un dict JSON-sérialisable. Le `user_id` est TOUJOURS injecté
côté serveur (depuis le token validé) et n'est jamais exposé au modèle : les
schémas envoyés à Gemini ne contiennent aucun identifiant utilisateur, le modèle
ne peut donc pas réclamer les données d'un autre compte.

Toute la logique d'analyse vit dans les services partagés (forecast, recurring,
supabase_service) : ces outils ne font que les appeler et mettre en forme.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
import os
import re
import unicodedata
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from services.forecast import build_forecast
from services.receivables import inflows_for_forecast, reconcile_receivables
from services.recurring import detect_recurring
from services.supabase_service import (
    fetch_budgets,
    fetch_expected_receivables,
    fetch_tax_settings,
    fetch_transactions,
    fetch_transactions_for_ai,
    list_accounts,
)
from services.tax import build_tax_vault, tax_deadlines_for_forecast


def _decimal(value) -> Decimal:
    try:
        return Decimal(str(value or "0"))
    except (InvalidOperation, ValueError):
        return Decimal("0")


def _parse_date(value: str) -> date | None:
    try:
        return datetime.fromisoformat(str(value)).date()
    except ValueError:
        return None


def _eur(value: Decimal | float | int) -> str:
    amount = Decimal(str(value)).quantize(Decimal("0.01"))
    return f"{amount:,.2f} EUR".replace(",", " ").replace(".", ",")


_PERIODS = {"current_month", "previous_month", "latest_available", "specific_month", "all_time"}
_MONTH_NUMBERS = {
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
}


def app_today() -> date:
    """Date métier dans le fuseau configuré, indépendante du fuseau du serveur."""
    timezone_name = os.environ.get("APP_TIMEZONE", "Europe/Paris")
    try:
        return datetime.now(ZoneInfo(timezone_name)).date()
    except ZoneInfoNotFoundError:
        print(f"[ai] fuseau inconnu APP_TIMEZONE={timezone_name}; repli UTC", flush=True)
        return datetime.now(ZoneInfo("UTC")).date()


def _month_start(value: date) -> date:
    return value.replace(day=1)


def _next_month(value: date) -> date:
    return date(value.year + (value.month == 12), 1 if value.month == 12 else value.month + 1, 1)


def _parse_month(value: str | None) -> date:
    raw = str(value or "").strip()
    try:
        return datetime.strptime(raw, "%Y-%m").date()
    except ValueError:
        normalized = unicodedata.normalize("NFKD", raw.casefold())
        plain = "".join(char for char in normalized if not unicodedata.combining(char))
        match = re.search(
            r"\b(" + "|".join(_MONTH_NUMBERS) + r")\s+(20\d{2})\b",
            plain,
        )
        if match:
            return date(int(match.group(2)), _MONTH_NUMBERS[match.group(1)], 1)
        raise ValueError("Le mois doit être fourni au format YYYY-MM ou 'mois YYYY'.")


def _resolve_period(
    transactions: list[dict],
    period: str = "current_month",
    month: str | None = None,
    today: date | None = None,
) -> dict:
    """Résout les périodes relatives côté serveur, sans laisser le modèle les deviner."""
    today = today or app_today()
    period = str(period or "current_month")
    if period not in _PERIODS:
        raise ValueError(f"Période inconnue : {period}")

    transaction_dates = [
        parsed
        for transaction in transactions
        if (parsed := _parse_date(transaction.get("date", ""))) is not None
    ]
    latest_date = max(transaction_dates, default=None)
    latest_month = latest_date.strftime("%Y-%m") if latest_date else None

    if period == "all_time":
        start = min(transaction_dates, default=None)
        end = (max(transaction_dates) + timedelta(days=1)) if transaction_dates else None
        label = "tout l'historique"
        month_key = None
    else:
        if period == "current_month":
            start = _month_start(today)
        elif period == "previous_month":
            start = _month_start(today) - timedelta(days=1)
            start = _month_start(start)
        elif period == "latest_available":
            start = _month_start(latest_date) if latest_date else None
        else:
            start = _parse_month(month)
        end = _next_month(start) if start else None
        month_key = start.strftime("%Y-%m") if start else None
        label = month_key or "aucune période disponible"

    return {
        "type": period,
        "mois": month_key,
        "libelle": label,
        "date_debut": start,
        "date_fin_exclue": end,
        "date_du_jour": today,
        "derniere_periode_disponible": latest_month,
    }


def _filter_period(transactions: list[dict], resolved: dict) -> list[dict]:
    start = resolved["date_debut"]
    end = resolved["date_fin_exclue"]
    if start is None or end is None:
        return []
    return [
        transaction
        for transaction in transactions
        if (parsed := _parse_date(transaction.get("date", ""))) is not None
        and start <= parsed < end
    ]


def _period_metadata(resolved: dict, available: bool) -> dict:
    return {
        "date_du_jour": resolved["date_du_jour"].isoformat(),
        "periode": resolved["libelle"],
        "type_periode": resolved["type"],
        "donnees_disponibles": available,
        "derniere_periode_disponible": resolved["derniere_periode_disponible"],
    }


def _period_required_response(transactions: list[dict]) -> dict:
    resolved = _resolve_period(transactions, "current_month")
    return {
        "date_du_jour": resolved["date_du_jour"].isoformat(),
        "periode": None,
        "type_periode": None,
        "donnees_disponibles": False,
        "derniere_periode_disponible": resolved["derniere_periode_disponible"],
        "statut": "periode_requise",
        "message": "Aucune période n'a été précisée. Demandez à l'utilisateur quelle période analyser.",
    }


def _opening_balance(user_id: str) -> Decimal:
    return sum(
        (_decimal(a.get("opening_balance")) for a in list_accounts(user_id)),
        Decimal("0"),
    )


def _build_kpis(
    transactions: list[dict],
    opening_balance: Decimal,
    period: str = "current_month",
    month: str | None = None,
    today: date | None = None,
) -> dict:
    dated = [(t, _parse_date(t.get("date", ""))) for t in transactions]
    dated = [(t, d) for t, d in dated if d is not None]
    resolved = _resolve_period(transactions, period, month, today)
    selected = [t for t in _filter_period(transactions, resolved) if not bool(t.get("is_transfer"))]
    available = bool(selected)
    period_end = resolved["date_fin_exclue"]
    balance_rows = [
        (transaction, transaction_date)
        for transaction, transaction_date in dated
        if period_end is None or transaction_date < period_end
    ]
    balance = opening_balance + sum(
        (_decimal(transaction.get("amount")) for transaction, _ in balance_rows),
        Decimal("0"),
    )
    balance_date = max((transaction_date for _, transaction_date in balance_rows), default=None)

    if not available:
        return {
            **_period_metadata(resolved, False),
            "solde_tresorerie": _eur(balance),
            "solde_au": balance_date.isoformat() if balance_date else None,
            "revenus": None,
            "depenses": None,
            "marge_nette": None,
            "message": f"Aucune transaction disponible pour {resolved['libelle']}.",
        }

    revenues = sum(
        (_decimal(t.get("amount")) for t in selected if _decimal(t.get("amount")) > 0),
        Decimal("0"),
    )
    expenses = sum(
        (abs(_decimal(t.get("amount"))) for t in selected if _decimal(t.get("amount")) < 0),
        Decimal("0"),
    )
    margin = ((revenues - expenses) / revenues * Decimal("100")) if revenues else Decimal("0")

    return {
        **_period_metadata(resolved, True),
        "solde_tresorerie": _eur(balance),
        "solde_au": balance_date.isoformat() if balance_date else None,
        "revenus": _eur(revenues),
        "depenses": _eur(expenses),
        "marge_nette": f"{margin.quantize(Decimal('0.1'))} %",
    }


def _spending_by_category(transactions: list[dict], limit: int = 8) -> list[dict]:
    totals: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
    for transaction in transactions:
        if bool(transaction.get("is_transfer")):
            continue
        amount = _decimal(transaction.get("amount"))
        if amount >= 0:
            continue
        category = str(transaction.get("category") or "Non categorise")
        totals[category] += abs(amount)
    rows = sorted(totals.items(), key=lambda item: item[1], reverse=True)[:limit]
    return [{"categorie": category, "montant": _eur(amount)} for category, amount in rows]


def _recent_transactions(transactions: list[dict], limit: int = 12) -> list[dict]:
    rows = []
    ordered = sorted(
        transactions,
        key=lambda transaction: _parse_date(transaction.get("date", "")) or date.min,
        reverse=True,
    )
    for transaction in ordered[:limit]:
        rows.append({
            "date": transaction.get("date"),
            "libelle": transaction.get("merchant"),
            "categorie": transaction.get("category"),
            "compte": transaction.get("account"),
            "montant": _eur(_decimal(transaction.get("amount"))),
            "type": transaction.get("type"),
            "virement_interne": bool(transaction.get("is_transfer")),
        })
    return rows


# --- Outils exposés au modèle (handlers : user_id injecté côté serveur) ---

def get_kpis(
    user_id: str,
    period: str | None = None,
    month: str | None = None,
    **_,
) -> dict:
    transactions = fetch_transactions(user_id)
    if period is None:
        return _period_required_response(transactions)
    return _build_kpis(
        transactions,
        _opening_balance(user_id),
        period=period,
        month=month,
    )


def get_forecast(user_id: str, **_) -> dict:
    transactions = fetch_transactions(user_id)
    today = app_today()
    transaction_dates = [
        parsed
        for transaction in transactions
        if (parsed := _parse_date(transaction.get("date", ""))) is not None
    ]
    data_date = max(transaction_dates, default=None)
    horizon_end = today + timedelta(days=200)
    deadlines = tax_deadlines_for_forecast(
        transactions, fetch_tax_settings(user_id), today, horizon_end
    )
    inflows = inflows_for_forecast(
        fetch_expected_receivables(user_id), transactions, today, horizon_end
    )
    forecast = build_forecast(
        transactions,
        float(_opening_balance(user_id)),
        tax_deadlines=deadlines,
        expected_inflows=inflows,
        today=today,
    )
    return {
        "date_du_jour": today.isoformat(),
        "donnees_au": data_date.isoformat() if data_date else None,
        "donnees_anciennes": bool(data_date and (today - data_date).days > 7),
        "solde_actuel": _eur(forecast.get("solde_actuel", 0)),
        "premier_decouvert": forecast.get("premier_decouvert"),
        "solde_min_90j": _eur(forecast.get("solde_min", 0)),
        "alerte_30j": forecast.get("alerte_30j"),
    }


def get_recurring_charges(user_id: str, **_) -> dict:
    recurring = detect_recurring(fetch_transactions(user_id))
    return {
        "total_mensuel": _eur(recurring.get("total_mensuel", 0)),
        "principales": recurring.get("charges", [])[:8],
    }


def get_spending_by_category(
    user_id: str,
    limit: int = 8,
    period: str | None = None,
    month: str | None = None,
    **_,
) -> dict:
    transactions = fetch_transactions(user_id)
    if period is None:
        return {
            **_period_required_response(transactions),
            "total_depenses": None,
            "depenses_par_categorie": [],
        }
    resolved = _resolve_period(transactions, period, month)
    selected = _filter_period(transactions, resolved)
    expenses = [
        transaction
        for transaction in selected
        if not bool(transaction.get("is_transfer")) and _decimal(transaction.get("amount")) < 0
    ]
    total = sum((abs(_decimal(transaction.get("amount"))) for transaction in expenses), Decimal("0"))
    available = bool(expenses)
    return {
        **_period_metadata(resolved, available),
        "total_depenses": _eur(total) if available else None,
        "depenses_par_categorie": _spending_by_category(
            expenses, max(1, min(int(limit or 8), 20))
        ),
        "message": None if available else f"Aucune dépense disponible pour {resolved['libelle']}.",
    }


def get_recent_transactions(
    user_id: str,
    limit: int = 12,
    period: str | None = None,
    month: str | None = None,
    **_,
) -> dict:
    bounded_limit = max(1, min(int(limit or 12), 50))
    if period is None:
        return {
            "periode": "dernières opérations",
            "transactions_recentes": _recent_transactions(
                fetch_transactions_for_ai(user_id, limit=bounded_limit), bounded_limit
            ),
        }

    transactions = fetch_transactions(user_id)
    resolved = _resolve_period(transactions, period, month)
    selected = _filter_period(transactions, resolved)
    return {
        **_period_metadata(resolved, bool(selected)),
        "transactions_recentes": _recent_transactions(selected, bounded_limit),
    }


def get_accounts(user_id: str, **_) -> dict:
    return {
        "comptes": [
            {"nom": a.get("name"), "solde_ouverture": _eur(_decimal(a.get("opening_balance")))}
            for a in list_accounts(user_id)
        ]
    }


def get_budgets(
    user_id: str,
    period: str | None = None,
    month: str | None = None,
    **_,
) -> dict:
    transactions = fetch_transactions(user_id)
    if period is None:
        return {
            **_period_required_response(transactions),
            "budgets_configures": False,
            "comparaisons": [],
        }

    resolved = _resolve_period(transactions, period, month)
    rows = fetch_budgets(user_id)
    legacy_rows = [row for row in rows if row.get("month") is None]
    month_rows = [
        row for row in rows if str(row.get("month") or "")[:7] == resolved["mois"]
    ]
    actuals: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
    for transaction in _filter_period(transactions, resolved):
        amount = _decimal(transaction.get("amount"))
        if bool(transaction.get("is_transfer")) or amount >= 0:
            continue
        category = str(transaction.get("category") or "Non catégorisé")
        actuals[category] += abs(amount)

    comparisons = []
    for budget in month_rows:
        category = str(budget.get("category") or "Non catégorisé")
        ceiling = _decimal(budget.get("amount"))
        actual = actuals.get(category, Decimal("0"))
        comparisons.append({
            "categorie": category,
            "budget_max": _eur(ceiling),
            "depenses_reelles": _eur(actual),
            "reste": _eur(ceiling - actual),
            "depasse": actual > ceiling,
        })

    return {
        **_period_metadata(resolved, bool(month_rows)),
        "budgets_configures": bool(month_rows),
        "avertissement": (
            "La migration des budgets mensuels n'est pas appliquée à certains budgets. "
            "Ils sont exclus car leur mois ne peut pas être vérifié."
            if legacy_rows
            else None
        ),
        "comparaisons": comparisons,
    }


def get_overdue_receivables(user_id: str, **_) -> dict:
    radar = reconcile_receivables(
        fetch_expected_receivables(user_id), fetch_transactions(user_id)
    )
    return {
        "encaissements_en_retard": [
            {
                "client": r["client"],
                "montant_attendu": _eur(_decimal(r["montant_attendu"])),
                "jours_retard": r["jours_retard"],
                "date_prevue": r["date_prevue"],
            }
            for r in radar.get("en_retard", [])
        ],
        "nombre_en_retard": len(radar.get("en_retard", [])),
        "total_en_retard": _eur(_decimal(radar.get("total_en_retard", 0))),
        "total_attendu": _eur(_decimal(radar.get("total_attendu", 0))),
    }


def get_tax_vault(user_id: str, **_) -> dict:
    vault = build_tax_vault(fetch_transactions(user_id), fetch_tax_settings(user_id))
    return {
        "configure": vault.get("configure"),
        "provision_recommandee_mensuelle": _eur(_decimal(vault.get("provision_mensuelle", 0))),
        "detail_provision": vault.get("detail"),
        "prochaines_echeances": vault.get("echeances", [])[:6],
    }


# --- Registre : déclarations (modèle) + handlers (serveur) ---

TOOLS: list[dict] = [
    {
        "name": "get_kpis",
        "description": (
            "Indicateurs clés pour une période explicite : solde de trésorerie, revenus, "
            "dépenses et marge nette. Pour « ce mois-ci », utiliser current_month. "
            "Ne jamais remplacer une période vide par latest_available sans l'accord de l'utilisateur."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "period": {
                    "type": "string",
                    "enum": ["current_month", "previous_month", "latest_available", "specific_month", "all_time"],
                    "description": "Période explicitement demandée par l'utilisateur.",
                },
                "month": {
                    "type": "string",
                    "description": "Mois YYYY-MM, obligatoire uniquement avec specific_month.",
                },
            },
            "required": ["period"],
        },
        "handler": get_kpis,
    },
    {
        "name": "get_forecast",
        "description": (
            "Prévision de trésorerie à 90 jours : solde actuel, date du premier découvert "
            "éventuel, solde minimum, alerte 30 jours. À utiliser pour « vais-je manquer de "
            "trésorerie », « quand serai-je à découvert »."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
        "handler": get_forecast,
    },
    {
        "name": "get_recurring_charges",
        "description": (
            "Charges récurrentes détectées (abonnements, prélèvements) et total mensuel. "
            "À utiliser pour « mes charges fixes », « mes abonnements »."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
        "handler": get_recurring_charges,
    },
    {
        "name": "get_spending_by_category",
        "description": (
            "Dépenses par catégorie pour une période explicite. À utiliser pour « où part "
            "mon argent », « mes plus gros postes de dépense ». Pour « ce mois-ci », utiliser "
            "current_month. Ne jamais utiliser latest_available comme remplacement silencieux."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "Nombre de catégories (défaut 8)."},
                "period": {
                    "type": "string",
                    "enum": ["current_month", "previous_month", "latest_available", "specific_month", "all_time"],
                    "description": "Période explicitement demandée par l'utilisateur.",
                },
                "month": {
                    "type": "string",
                    "description": "Mois YYYY-MM, obligatoire uniquement avec specific_month.",
                },
            },
            "required": ["period"],
        },
        "handler": get_spending_by_category,
    },
    {
        "name": "get_recent_transactions",
        "description": (
            "Transactions de l'utilisateur. Sans période, retourne les dernières opérations. "
            "Avec une période, retourne uniquement les opérations de cette période."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "minimum": 1, "maximum": 50},
                "period": {
                    "type": "string",
                    "enum": ["current_month", "previous_month", "latest_available", "specific_month", "all_time"],
                },
                "month": {
                    "type": "string",
                    "description": "Mois YYYY-MM, obligatoire avec specific_month.",
                },
            },
            "required": [],
        },
        "handler": get_recent_transactions,
    },
    {
        "name": "get_accounts",
        "description": "Liste des comptes bancaires et leur solde d'ouverture.",
        "parameters": {"type": "object", "properties": {}, "required": []},
        "handler": get_accounts,
    },
    {
        "name": "get_budgets",
        "description": (
            "Compare, pour une période explicite, les plafonds budgétaires configurés aux "
            "dépenses réellement calculées depuis les transactions. À utiliser uniquement "
            "pour une question de budget, plafond, reste ou dépassement. Ne jamais l'utiliser "
            "pour répondre simplement à « où part mon argent »."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "period": {
                    "type": "string",
                    "enum": ["current_month", "previous_month", "latest_available", "specific_month"],
                },
                "month": {
                    "type": "string",
                    "description": "Mois YYYY-MM, obligatoire avec specific_month.",
                },
            },
            "required": ["period"],
        },
        "handler": get_budgets,
    },
    {
        "name": "get_overdue_receivables",
        "description": (
            "Encaissements clients en retard, d'après l'échéancier déclaré par "
            "l'utilisateur et rapproché des crédits bancaires réels (un attendu sans "
            "crédit reçu après la date prévue). À utiliser pour « qui me doit de "
            "l'argent », « quels clients sont en retard », « mes impayés », « mes relances »."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
        "handler": get_overdue_receivables,
    },
    {
        "name": "get_tax_vault",
        "description": (
            "Coffre-fort fiscal : provision mensuelle recommandée (TVA / charges sociales / "
            "impôt, en % du chiffre d'affaires) et prochaines échéances fiscales et sociales. "
            "À utiliser pour « combien mettre de côté pour les impôts/charges », « quand "
            "tombe la TVA / l'URSSAF », « mes échéances fiscales »."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
        "handler": get_tax_vault,
    },
]

# Déclarations envoyées à Gemini (sans le handler ni le moindre user_id).
TOOL_DECLARATIONS: list[dict] = [
    {
        "type": "function",
        "name": tool["name"],
        "description": tool["description"],
        "parameters": tool["parameters"],
    }
    for tool in TOOLS
]

_BUSINESS_ONLY_TOOLS = {"get_overdue_receivables", "get_tax_vault"}


def tool_declarations_for(workspace_type: str) -> list[dict]:
    if workspace_type == "business":
        return TOOL_DECLARATIONS
    return [tool for tool in TOOL_DECLARATIONS if tool["name"] not in _BUSINESS_ONLY_TOOLS]

_HANDLERS = {tool["name"]: tool["handler"] for tool in TOOLS}


def run_tool(name: str, user_id: str, arguments: dict | None = None) -> dict:
    """Exécute un outil demandé par le modèle. Un échec d'outil ne casse jamais
    la conversation : on renvoie une erreur lisible que le modèle pourra gérer."""
    handler = _HANDLERS.get(name)
    if handler is None:
        return {"erreur": f"Outil inconnu : {name}"}
    try:
        print(f"[ai] appel outil {name} arguments={arguments or {}}", flush=True)
        return handler(user_id, **(arguments or {}))
    except Exception as exc:  # noqa: BLE001, robustesse volontaire côté agent
        print(f"[ai] outil {name} en echec : {exc}", flush=True)
        return {
            "statut": "erreur_outil",
            "outil": name,
            "donnees_disponibles": False,
            "erreur": f"L'outil {name} n'a pas pu s'exécuter.",
            "consigne": "Signaler l'échec technique et proposer de réessayer. Ne pas substituer d'autres données.",
        }
