"""Appariement des deux jambes d'un virement entre comptes."""
from __future__ import annotations

import re

import pandas as pd

_VIREMENT = re.compile(r"virement|\bvir\b|transfert", re.I)


def detect_transfer_pairs(rows: list[dict], max_days: int = 3) -> list[str]:
    """Identifie les paires (débit sur un compte / crédit sur un autre) qui
    correspondent à un virement interne, et renvoie les ids à marquer."""
    if not rows:
        return []

    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    df = df.dropna(subset=["date", "amount"])

    # Candidats : libellé évoquant un virement, pas déjà marqués
    df = df[df["merchant"].fillna("").str.contains(_VIREMENT)]
    df = df[~df["is_transfer"].fillna(False).astype(bool)]

    debits = list(df[df["type"] == "debit"].itertuples(index=False))
    credits = list(df[df["type"] == "credit"].itertuples(index=False))

    flagged: set[str] = set()
    used_credits: set[str] = set()

    for d in debits:
        for c in credits:
            if c.id in used_credits or c.account_id == d.account_id:
                continue  # même compte → pas un virement entre comptes
            if abs(abs(c.amount) - abs(d.amount)) > 0.01:
                continue  # montants différents
            if abs((c.date - d.date).days) > max_days:
                continue  # dates trop éloignées
            flagged.add(d.id)
            flagged.add(c.id)
            used_credits.add(c.id)
            break

    return list(flagged)
