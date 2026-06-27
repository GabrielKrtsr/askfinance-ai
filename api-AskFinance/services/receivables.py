"""Radar des encaissements : recettes récurrentes (clients réguliers) et
détection des paiements attendus en retard ou manquants.

Même logique de clustering que `recurring.py`, mais appliquée aux **crédits**
(encaissements clients) au lieu des débits. L'idée : un client qui versait
~X € à intervalle régulier et dont le versement n'est pas arrivé à la date
attendue = un encaissement en retard → on propose une relance.
"""
from __future__ import annotations

from datetime import date

import pandas as pd

from services.recurring import _frequency, merchant_key

# Au-delà de ce délai après la date attendue, on considère le client comme
# « inactif » (il a sans doute cessé de payer) et on ne le signale plus en retard.
_INACTIF_FACTEUR = 3.0


def _grace_days(median: float) -> int:
    """Tolérance avant de déclarer un encaissement en retard (jours)."""
    return max(5, round(median * 0.3))


def _relance_text(client: str, montant: float, jours_retard: int) -> str:
    """Brouillon de relance amiable, prêt à copier-coller (ton courtois, B2B)."""
    montant_fr = f"{montant:,.2f} €".replace(",", " ").replace(".", ",")
    return (
        f"Objet : Relance — règlement en attente\n\n"
        f"Bonjour,\n\n"
        f"Sauf erreur de notre part, nous n'avons pas encore reçu votre "
        f"règlement habituel d'environ {montant_fr}, attendu depuis "
        f"{jours_retard} jour(s).\n\n"
        f"Pourriez-vous nous indiquer la date de paiement prévue ? Si le "
        f"règlement a déjà été effectué, merci de ne pas tenir compte de ce "
        f"message.\n\n"
        f"Restant à votre disposition,\n"
        f"Cordialement."
    )


def detect_receivables(
    transactions: list[dict],
    today: date | None = None,
    min_occurrences: int = 3,
) -> dict:
    """Analyse les encaissements et renvoie les recettes récurrentes détectées,
    avec leur statut (à jour / en retard) au regard de la date du jour."""
    today = today or date.today()
    if not transactions:
        return {"recettes": [], "en_retard": [], "total_attendu_mensuel": 0.0}

    df = pd.DataFrame(transactions)
    if "is_transfer" in df.columns:  # on ignore les virements internes
        df = df[~df["is_transfer"].fillna(False).astype(bool)]
    df = df[df["type"] == "credit"].copy()
    if df.empty:
        return {"recettes": [], "en_retard": [], "total_attendu_mensuel": 0.0}

    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").abs()
    df = df.dropna(subset=["date", "amount"])
    df["key"] = df["merchant"].apply(merchant_key)
    df = df[df["key"] != ""]

    now = pd.Timestamp(today)
    recettes: list[dict] = []

    for key, group in df.groupby("key"):
        group = group.sort_values("date")
        if len(group) < min_occurrences:
            continue

        intervals = group["date"].diff().dt.days.dropna()
        if intervals.empty:
            continue

        median = float(intervals.median())
        freq = _frequency(median)
        if freq is None:
            continue

        # Régularité : on rejette les flux trop irréguliers (faux positifs).
        spread = intervals.std()
        if pd.notna(spread) and median > 0 and spread > median * 0.6:
            continue

        amounts = group["amount"]
        montant_attendu = float(amounts.median())
        last_date = group["date"].iloc[-1]
        prochaine_attendue = last_date + pd.Timedelta(days=round(median))
        grace = _grace_days(median)

        # Client devenu inactif : on ne le considère plus comme « en retard ».
        inactif = (now - last_date).days > median * _INACTIF_FACTEUR
        jours_retard = int((now - prochaine_attendue).days)
        en_retard = (not inactif) and jours_retard > grace

        recette = {
            "client": str(key).title(),
            "key": str(key),
            "frequence": freq,
            "montant_attendu": round(montant_attendu, 2),
            "dernier_encaissement": last_date.strftime("%Y-%m-%d"),
            "prochaine_attendue": prochaine_attendue.strftime("%Y-%m-%d"),
            "occurrences": int(len(group)),
            "statut": "en_retard" if en_retard else ("inactif" if inactif else "a_jour"),
            "jours_retard": max(0, jours_retard) if en_retard else 0,
            "relance": (
                _relance_text(str(key).title(), montant_attendu, max(0, jours_retard))
                if en_retard
                else None
            ),
        }
        recettes.append(recette)

    recettes.sort(key=lambda r: (r["statut"] != "en_retard", -r["montant_attendu"]))
    en_retard = [r for r in recettes if r["statut"] == "en_retard"]
    # Total mensuel attendu (recettes actives, hors clients inactifs).
    total = round(
        sum(
            _to_monthly(r["montant_attendu"], r["frequence"])
            for r in recettes
            if r["statut"] != "inactif"
        ),
        2,
    )
    return {
        "recettes": recettes,
        "en_retard": en_retard,
        "total_attendu_mensuel": total,
    }


def _to_monthly(amount: float, freq: str) -> float:
    if freq == "hebdomadaire":
        return amount * 4.345
    if freq == "bimensuel":
        return amount * 2
    if freq == "annuel":
        return amount / 12
    return amount  # mensuel
