"""Coffre-fort fiscal : provision recommandée (% du CA) et échéances fiscales/sociales.

⚠️ Tout est **indicatif** : les taux sont paramétrés par l'utilisateur (pas calculés
à partir d'un régime fiscal réel), et les montants d'échéance sont estimés à partir du
chiffre d'affaires constaté. À valider avec un expert-comptable. Ces estimations
servent à anticiper la trésorerie, pas à produire une déclaration.

Les dates d'échéance suivent le calendrier français usuel :
- TVA (CA3)         : ~le 20 du mois (mensuel), ou avril/juillet/oct./janv. (trimestriel)
- URSSAF (TNS)      : le 5 (mensuel), ou 5 fév./mai/août/nov. (trimestriel)
- IS (acomptes)     : 15 mars / 15 juin / 15 sept. / 15 déc.
"""
from __future__ import annotations

from datetime import date, timedelta

import pandas as pd

# Horizon d'affichage des prochaines échéances (jours).
_HORIZON_ECHEANCES = 180

_POSTE_LABEL = {
    "tva": "TVA",
    "social": "Charges sociales (URSSAF)",
    "is": "Impôt (IS/IR)",
}


def _settings_value(settings: dict | None, key: str, default: float = 0.0) -> float:
    if not settings:
        return default
    try:
        return float(settings.get(key) or default)
    except (TypeError, ValueError):
        return default


def _monthly_ca(transactions: list[dict]) -> float:
    """CA mensuel de référence = médiane des revenus mensuels constatés (robuste)."""
    if not transactions:
        return 0.0
    df = pd.DataFrame(transactions)
    if "is_transfer" in df.columns:
        df = df[~df["is_transfer"].fillna(False).astype(bool)]
    df = df[df["type"] == "credit"].copy()
    if df.empty:
        return 0.0
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").abs()
    df = df.dropna(subset=["date", "amount"])
    if df.empty:
        return 0.0
    par_mois = df.groupby(df["date"].dt.to_period("M"))["amount"].sum()
    return float(par_mois.median()) if not par_mois.empty else 0.0


def _period_months(periodicite: str) -> int:
    return {"mensuel": 1, "trimestriel": 3, "annuel": 12, "aucun": 0}.get(periodicite, 1)


def _future_dates(anchors: list[tuple[int, int]], today: date, horizon_days: int) -> list[date]:
    """Renvoie les dates (mois, jour) tombant dans [today, today+horizon]."""
    end = today + timedelta(days=horizon_days)
    out: list[date] = []
    for year in (today.year, today.year + 1):
        for month, day in anchors:
            try:
                d = date(year, month, day)
            except ValueError:
                continue
            if today <= d <= end:
                out.append(d)
    return sorted(out)


def _deadlines(monthly_ca: float, settings: dict | None, today: date, horizon_days: int) -> list[dict]:
    """Construit la liste des échéances estimées dans la fenêtre donnée."""
    tva_taux = _settings_value(settings, "provision_tva_taux")
    social_taux = _settings_value(settings, "provision_social_taux")
    is_taux = _settings_value(settings, "provision_is_taux")
    tva_periodicite = (settings or {}).get("tva_periodicite", "mensuel")
    urssaf_periodicite = (settings or {}).get("urssaf_periodicite", "trimestriel")

    echeances: list[dict] = []

    # --- TVA ---
    if tva_taux > 0 and tva_periodicite != "aucun":
        if tva_periodicite == "mensuel":
            anchors = [(m, 20) for m in range(1, 13)]
            mult = 1
        elif tva_periodicite == "trimestriel":
            anchors = [(4, 20), (7, 20), (10, 20), (1, 20)]
            mult = 3
        else:  # annuel
            anchors = [(5, 20)]
            mult = 12
        montant = round(monthly_ca * tva_taux / 100 * mult, 2)
        for d in _future_dates(anchors, today, horizon_days):
            echeances.append({"date": d, "type": "tva", "libelle": "TVA", "montant_estime": montant})

    # --- URSSAF / charges sociales ---
    if social_taux > 0:
        if urssaf_periodicite == "mensuel":
            anchors = [(m, 5) for m in range(1, 13)]
            mult = 1
        else:  # trimestriel
            anchors = [(2, 5), (5, 5), (8, 5), (11, 5)]
            mult = 3
        montant = round(monthly_ca * social_taux / 100 * mult, 2)
        for d in _future_dates(anchors, today, horizon_days):
            echeances.append({"date": d, "type": "social", "libelle": "URSSAF", "montant_estime": montant})

    # --- IS / IR (acomptes trimestriels) ---
    if is_taux > 0:
        anchors = [(3, 15), (6, 15), (9, 15), (12, 15)]
        montant = round(monthly_ca * is_taux / 100 * 3, 2)
        for d in _future_dates(anchors, today, horizon_days):
            echeances.append({"date": d, "type": "is", "libelle": "Acompte d'impôt", "montant_estime": montant})

    echeances.sort(key=lambda e: e["date"])
    return echeances


def build_tax_vault(transactions: list[dict], settings: dict | None, today: date | None = None) -> dict:
    """Synthèse du coffre-fort fiscal : provision recommandée + prochaines échéances."""
    today = today or date.today()
    monthly_ca = _monthly_ca(transactions)

    taux = {
        "tva": _settings_value(settings, "provision_tva_taux"),
        "social": _settings_value(settings, "provision_social_taux"),
        "is": _settings_value(settings, "provision_is_taux"),
    }
    configure = any(v > 0 for v in taux.values())

    detail = [
        {
            "poste": _POSTE_LABEL[k],
            "type": k,
            "taux": round(v, 2),
            "montant_mensuel": round(monthly_ca * v / 100, 2),
        }
        for k, v in taux.items()
    ]
    provision_mensuelle = round(sum(d["montant_mensuel"] for d in detail), 2)

    echeances = [
        {
            "date": e["date"].strftime("%Y-%m-%d"),
            "type": e["type"],
            "libelle": e["libelle"],
            "montant_estime": e["montant_estime"],
        }
        for e in _deadlines(monthly_ca, settings, today, _HORIZON_ECHEANCES)
    ]

    return {
        "configure": configure,
        "ca_mensuel_reference": round(monthly_ca, 2),
        "provision_mensuelle": provision_mensuelle,
        "detail": detail,
        "echeances": echeances,
    }


def tax_deadlines_for_forecast(
    transactions: list[dict], settings: dict | None, start, end
) -> list[dict]:
    """Échéances fiscales à injecter dans la prévision de trésorerie (montants positifs,
    la prévision les traitera comme des décaissements). `start`/`end` : Timestamps pandas."""
    if not settings:
        return []
    today = pd.Timestamp(start).date()
    horizon = max(0, (pd.Timestamp(end).date() - today).days)
    monthly_ca = _monthly_ca(transactions)
    return [
        {
            "date": e["date"].strftime("%Y-%m-%d"),
            "amount": e["montant_estime"],
            "label": e["libelle"],
        }
        for e in _deadlines(monthly_ca, settings, today, horizon)
        if e["montant_estime"] > 0
    ]
