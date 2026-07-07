"""Échéancier des encaissements clients (déclaratif) + rapprochement bancaire.

L'utilisateur déclare les virements qu'il attend (client, montant, date prévue) ;
on rapproche ensuite chaque attendu des crédits réellement reçus sur les relevés :
- un crédit du bon montant arrive autour de la date prévue → « reçu » ;
- la date prévue est dépassée et rien n'est arrivé → « en retard » (+ brouillon de relance) ;
- sinon → « à venir ».
"""
from __future__ import annotations

from datetime import date, datetime

from services.recurring import merchant_key

# Tolérance avant de déclarer un encaissement en retard (jours après la date prévue).
GRACE_DAYS = 3
# Fenêtre de rapprochement autour de la date prévue (jours avant / après).
MATCH_BEFORE = 7
MATCH_AFTER = 60


def _to_date(value) -> date | None:
    try:
        return datetime.fromisoformat(str(value)[:10]).date()
    except (TypeError, ValueError):
        return None


def _to_float(value) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _relance_text(client: str, montant: float, jours_retard: int) -> str:
    """Brouillon de relance amiable, prêt à copier-coller (ton courtois, B2B)."""
    montant_fr = f"{montant:,.2f} €".replace(",", " ").replace(".", ",")
    return (
        f"Objet : Relance — règlement en attente\n\n"
        f"Bonjour,\n\n"
        f"Sauf erreur de notre part, nous n'avons pas encore reçu votre "
        f"règlement de {montant_fr}, attendu depuis {jours_retard} jour(s).\n\n"
        f"Pourriez-vous nous indiquer la date de paiement prévue ? Si le "
        f"règlement a déjà été effectué, merci de ne pas tenir compte de ce "
        f"message.\n\n"
        f"Cordialement."
    )


def _credits(transactions: list[dict]) -> list[dict]:
    """Liste des crédits réels (hors virements internes), triés par date."""
    rows = []
    for t in transactions:
        if t.get("type") != "credit" or bool(t.get("is_transfer")):
            continue
        d = _to_date(t.get("date"))
        if d is None:
            continue
        rows.append({
            "date": d,
            "amount": abs(_to_float(t.get("amount"))),
            "key": merchant_key(str(t.get("merchant") or "")),
        })
    rows.sort(key=lambda c: c["date"])
    return rows


def _find_match(credits: list[dict], used: set[int], amount: float, due: date, client_key: str):
    """Cherche le meilleur crédit non encore apparié : bon montant, dans la fenêtre de
    date, en préférant un libellé qui correspond au client puis la date la plus proche."""
    best_idx = None
    best_score = None
    for i, c in enumerate(credits):
        if i in used:
            continue
        if abs(c["amount"] - amount) > max(1.0, amount * 0.01):
            continue
        delta = (c["date"] - due).days
        if delta < -MATCH_BEFORE or delta > MATCH_AFTER:
            continue
        key_match = 1 if (client_key and c["key"] and (client_key in c["key"] or c["key"] in client_key)) else 0
        score = (key_match, -abs(delta))
        if best_score is None or score > best_score:
            best_score = score
            best_idx = i
    return best_idx


def reconcile_receivables(expected: list[dict], transactions: list[dict], today: date | None = None) -> dict:
    """Rapproche les encaissements attendus (déclarés) des crédits réellement reçus."""
    today = today or date.today()
    credits = _credits(transactions)
    used: set[int] = set()
    rows: list[dict] = []

    for e in sorted(expected, key=lambda x: str(x.get("due_date") or "")):
        due = _to_date(e.get("due_date"))
        amount = abs(_to_float(e.get("amount")))
        client = str(e.get("client") or "")
        idx = _find_match(credits, used, amount, due, merchant_key(client)) if due else None

        if idx is not None:
            used.add(idx)
            statut, jours_retard = "received", 0
            date_recu = credits[idx]["date"].strftime("%Y-%m-%d")
            relance = None
        elif due and (today - due).days > GRACE_DAYS:
            statut = "late"
            jours_retard = (today - due).days
            date_recu = None
            relance = _relance_text(client, amount, jours_retard)
        else:
            statut, jours_retard, date_recu, relance = "upcoming", 0, None, None

        rows.append({
            "id": e.get("id"),
            "client": client,
            "montant_attendu": round(amount, 2),
            "date_prevue": due.strftime("%Y-%m-%d") if due else None,
            "statut": statut,
            "jours_retard": jours_retard,
            "date_recu": date_recu,
            "relance": relance,
        })

    order = {"late": 0, "upcoming": 1, "received": 2}
    rows.sort(key=lambda r: (order.get(r["statut"], 3), r["date_prevue"] or ""))
    en_retard = [r for r in rows if r["statut"] == "late"]
    total_attendu = round(
        sum(r["montant_attendu"] for r in rows if r["statut"] in ("late", "upcoming")), 2
    )
    total_en_retard = round(sum(r["montant_attendu"] for r in en_retard), 2)
    return {
        "receivables": rows,
        "en_retard": en_retard,
        "total_attendu": total_attendu,
        "total_en_retard": total_en_retard,
    }


def inflows_for_forecast(
    expected: list[dict], transactions: list[dict], start: date, end: date, today: date | None = None
) -> list[dict]:
    """Encaissements attendus (non encore reçus) dans [start, end], à injecter comme
    entrées positives dans la prévision de trésorerie."""
    data = reconcile_receivables(expected, transactions, today)
    out: list[dict] = []
    for r in data["receivables"]:
        if r["statut"] != "upcoming" or not r["date_prevue"]:
            continue
        d = _to_date(r["date_prevue"])
        if d and start <= d <= end:
            out.append({"date": r["date_prevue"], "amount": r["montant_attendu"]})
    return out
