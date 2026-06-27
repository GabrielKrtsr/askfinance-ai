"""Détection des charges récurrentes (abonnements, charges fixes/variables)."""
from __future__ import annotations

import re

import pandas as pd

# Préfixes de type de paiement à retirer du libellé pour obtenir une clé stable.
_PAYMENT_PREFIXES = r"\b(CB|PRLV|VIR|VIREMENT|PAIEMENT|DAC|ACHAT|CARTE|SEPA)\b"


def merchant_key(label: str) -> str:
    """'CB NETFLIX FACT 120626' -> 'NETFLIX' (clé marchand stable dans le temps)."""
    s = str(label).upper()
    s = re.sub(r"\bFACT\b.*", "", s)        # "FACT 120626" et tout ce qui suit
    s = re.sub(_PAYMENT_PREFIXES, "", s)    # types de paiement
    s = re.sub(r"\d", "", s)                # chiffres (dates, références)
    s = re.sub(r"[^A-Z\s]", " ", s)         # ponctuation
    return re.sub(r"\s+", " ", s).strip()


def _frequency(median_days: float) -> str | None:
    if 26 <= median_days <= 35:
        return "mensuel"
    if 13 <= median_days <= 16:
        return "bimensuel"
    if 6 <= median_days <= 8:
        return "hebdomadaire"
    if 350 <= median_days <= 380:
        return "annuel"
    return None


def _monthly_amount(amount: float, freq: str) -> float:
    if freq == "hebdomadaire":
        return amount * 4.345
    if freq == "bimensuel":
        return amount * 2
    if freq == "annuel":
        return amount / 12
    return amount  # mensuel


def detect_recurring(transactions: list[dict], min_occurrences: int = 2) -> dict:
    """Analyse les transactions et renvoie les charges récurrentes détectées."""
    if not transactions:
        return {"charges": [], "total_mensuel": 0.0}

    df = pd.DataFrame(transactions)
    if "is_transfer" in df.columns:  # on ignore les virements internes
        df = df[~df["is_transfer"].fillna(False).astype(bool)]
    df = df[df["type"] == "debit"].copy()
    if df.empty:
        return {"charges": [], "total_mensuel": 0.0}

    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").abs()
    df = df.dropna(subset=["date", "amount"])
    df["key"] = df["merchant"].apply(merchant_key)
    df = df[df["key"] != ""]

    charges: list[dict] = []

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

        # Régularité : on rejette si les intervalles sont trop dispersés
        spread = intervals.std()
        if pd.notna(spread) and median > 0 and spread > median * 0.5:
            continue

        amounts = group["amount"]
        mean_amount = float(amounts.mean())
        cv = float(amounts.std() / mean_amount) if mean_amount else 0.0  # variation relative
        type_charge = "fixe" if cv < 0.05 else "variable"
        if type_charge == "fixe" and freq == "mensuel" and mean_amount <= 50:
            type_charge = "abonnement"

        last_amount = float(amounts.iloc[-1])
        previous = amounts.iloc[:-1]
        alerte: str | None = None
        if len(previous) >= 1 and last_amount > float(previous.median()) * 1.10:
            alerte = "hausse"

        next_date = (
            group["date"].iloc[-1] + pd.Timedelta(days=round(median))
        ).strftime("%Y-%m-%d")

        charges.append({
            "merchant": str(key).title(),
            "key": str(key),
            "type": type_charge,
            "frequence": freq,
            "montant_mensuel": round(_monthly_amount(mean_amount, freq), 2),
            "dernier_montant": round(last_amount, 2),
            "occurrences": int(len(group)),
            "prochaine_date": next_date,
            "alerte": alerte,
        })

    _flag_duplicates(charges)
    charges.sort(key=lambda c: c["montant_mensuel"], reverse=True)
    total = round(sum(c["montant_mensuel"] for c in charges), 2)
    return {"charges": charges, "total_mensuel": total}


def _flag_duplicates(charges: list[dict]) -> None:
    """Marque comme doublon deux charges de même fréquence et montant quasi identique."""
    for i, a in enumerate(charges):
        for b in charges[i + 1:]:
            if a["frequence"] != b["frequence"]:
                continue
            m1, m2 = a["montant_mensuel"], b["montant_mensuel"]
            if max(m1, m2) > 0 and abs(m1 - m2) / max(m1, m2) < 0.02:
                a["alerte"] = a["alerte"] or "doublon"
                b["alerte"] = b["alerte"] or "doublon"
