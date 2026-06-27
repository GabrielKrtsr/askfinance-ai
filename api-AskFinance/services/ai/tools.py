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

from services.forecast import build_forecast
from services.receivables import detect_receivables
from services.recurring import detect_recurring
from services.supabase_service import (
    fetch_budgets,
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


def _opening_balance(user_id: str) -> Decimal:
    return sum(
        (_decimal(a.get("opening_balance")) for a in list_accounts(user_id)),
        Decimal("0"),
    )


def _build_kpis(transactions: list[dict], opening_balance: Decimal) -> dict:
    dated = [(t, _parse_date(t.get("date", ""))) for t in transactions]
    dated = [(t, d) for t, d in dated if d is not None]
    if not dated:
        return {
            "solde_tresorerie": _eur(opening_balance),
            "periode": "aucune transaction",
            "revenus": _eur(0),
            "depenses": _eur(0),
            "marge_nette": "0,0 %",
        }

    last_date = max(d for _, d in dated)
    current = [
        t
        for t, d in dated
        if d.year == last_date.year
        and d.month == last_date.month
        and not bool(t.get("is_transfer"))
    ]
    revenues = sum(
        (_decimal(t.get("amount")) for t in current if _decimal(t.get("amount")) > 0),
        Decimal("0"),
    )
    expenses = sum(
        (abs(_decimal(t.get("amount"))) for t in current if _decimal(t.get("amount")) < 0),
        Decimal("0"),
    )
    balance = opening_balance + sum((_decimal(t.get("amount")) for t, _ in dated), Decimal("0"))
    margin = ((revenues - expenses) / revenues * Decimal("100")) if revenues else Decimal("0")

    return {
        "solde_tresorerie": _eur(balance),
        "periode": last_date.strftime("%Y-%m"),
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
    for transaction in transactions[:limit]:
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

def get_kpis(user_id: str, **_) -> dict:
    return _build_kpis(fetch_transactions(user_id), _opening_balance(user_id))


def get_forecast(user_id: str, **_) -> dict:
    transactions = fetch_transactions(user_id)
    deadlines = tax_deadlines_for_forecast(
        transactions, fetch_tax_settings(user_id), date.today(), date.today() + timedelta(days=200)
    )
    forecast = build_forecast(transactions, float(_opening_balance(user_id)), tax_deadlines=deadlines)
    return {
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


def get_spending_by_category(user_id: str, limit: int = 8, **_) -> dict:
    return {"depenses_par_categorie": _spending_by_category(fetch_transactions(user_id), int(limit or 8))}


def get_recent_transactions(user_id: str, limit: int = 12, **_) -> dict:
    return {"transactions_recentes": _recent_transactions(fetch_transactions_for_ai(user_id), int(limit or 12))}


def get_accounts(user_id: str, **_) -> dict:
    return {
        "comptes": [
            {"nom": a.get("name"), "solde_ouverture": _eur(_decimal(a.get("opening_balance")))}
            for a in list_accounts(user_id)
        ]
    }


def get_budgets(user_id: str, **_) -> dict:
    return {
        "budgets": [
            {"categorie": b.get("category"), "budget": _eur(_decimal(b.get("amount")))}
            for b in fetch_budgets(user_id)
        ]
    }


def get_overdue_receivables(user_id: str, **_) -> dict:
    radar = detect_receivables(fetch_transactions(user_id))
    return {
        "encaissements_en_retard": [
            {
                "client": r["client"],
                "montant_attendu": _eur(_decimal(r["montant_attendu"])),
                "jours_retard": r["jours_retard"],
                "prochaine_attendue": r["prochaine_attendue"],
            }
            for r in radar.get("en_retard", [])
        ],
        "nombre_en_retard": len(radar.get("en_retard", [])),
        "total_attendu_mensuel": _eur(_decimal(radar.get("total_attendu_mensuel", 0))),
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
            "Indicateurs clés du mois en cours : solde de trésorerie, revenus, dépenses, "
            "marge nette. À utiliser pour toute question sur la situation actuelle."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
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
            "Dépenses agrégées par catégorie. À utiliser pour « où part mon argent », "
            "« mes plus gros postes de dépense »."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "Nombre de catégories (défaut 8)."}
            },
            "required": [],
        },
        "handler": get_spending_by_category,
    },
    {
        "name": "get_recent_transactions",
        "description": (
            "Dernières transactions de l'utilisateur. À utiliser pour « mes dernières "
            "opérations » ou vérifier une dépense précise."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "Nombre de transactions (défaut 12)."}
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
        "description": "Budgets définis par catégorie.",
        "parameters": {"type": "object", "properties": {}, "required": []},
        "handler": get_budgets,
    },
    {
        "name": "get_overdue_receivables",
        "description": (
            "Encaissements clients récurrents en retard (paiements habituels qui ne sont "
            "pas arrivés à la date attendue) + total mensuel attendu. À utiliser pour "
            "« qui me doit de l'argent », « quels clients sont en retard de paiement », "
            "« mes impayés », « mes relances »."
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

_HANDLERS = {tool["name"]: tool["handler"] for tool in TOOLS}


def run_tool(name: str, user_id: str, arguments: dict | None = None) -> dict:
    """Exécute un outil demandé par le modèle. Un échec d'outil ne casse jamais
    la conversation : on renvoie une erreur lisible que le modèle pourra gérer."""
    handler = _HANDLERS.get(name)
    if handler is None:
        return {"erreur": f"Outil inconnu : {name}"}
    try:
        return handler(user_id, **(arguments or {}))
    except Exception as exc:  # noqa: BLE001 — robustesse volontaire côté agent
        print(f"[ai] outil {name} en echec : {exc}", flush=True)
        return {"erreur": f"L'outil {name} n'a pas pu s'exécuter."}


def build_full_context(user_id: str) -> dict:
    """Snapshot complet (compose les outils). Sert de repli si le function-calling
    échoue : on injecte tout le contexte en un seul appel."""
    return {
        "kpis": get_kpis(user_id),
        **get_accounts(user_id),
        **get_spending_by_category(user_id),
        **get_budgets(user_id),
        "charges_recurrentes": get_recurring_charges(user_id),
        "prevision": get_forecast(user_id),
        "encaissements": get_overdue_receivables(user_id),
        "coffre_fort_fiscal": get_tax_vault(user_id),
        **get_recent_transactions(user_id),
    }


# --- Libellés d'étape (affichés pendant le streaming quand un outil tourne) ---

TOOL_STATUS: dict[str, str] = {
    "get_kpis": "Je consulte vos indicateurs…",
    "get_forecast": "Je consulte votre prévision…",
    "get_recurring_charges": "J'examine vos charges récurrentes…",
    "get_spending_by_category": "J'analyse vos dépenses…",
    "get_recent_transactions": "Je regarde vos dernières opérations…",
    "get_accounts": "Je consulte vos comptes…",
    "get_budgets": "Je consulte vos budgets…",
    "get_overdue_receivables": "Je vérifie vos encaissements en retard…",
    "get_tax_vault": "Je consulte votre coffre-fort fiscal…",
}


def tool_status_label(name: str) -> str:
    return TOOL_STATUS.get(name, "Je consulte vos données…")
