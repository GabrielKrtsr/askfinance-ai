"""Prévision de trésorerie 90 jours : récurrents planifiés + régression du flux de fond."""
from __future__ import annotations

from collections.abc import Callable
from datetime import date

import pandas as pd
from sklearn.linear_model import LinearRegression

from services.recurring import detect_recurring, merchant_key

HORIZON = 90  # jours projetés
FREQ_DAYS = {"hebdomadaire": 7, "bimensuel": 14, "mensuel": 30, "annuel": 365}


def _empty() -> dict:
    return {
        "solde_actuel": 0.0,
        "serie": [],
        "premier_decouvert": None,
        "solde_min": 0.0,
        "alerte_30j": False,
    }


def _fit_background(background: pd.Series) -> Callable[[pd.Timestamp], float]:
    """Renvoie une fonction qui prédit le flux de fond d'un jour donné.
    Régression sur le jour de la semaine ; repli sur la moyenne si peu d'historique."""
    if len(background) < 14:
        moyenne = float(background.mean()) if len(background) else 0.0
        return lambda _d: moyenne

    X = pd.get_dummies(background.index.dayofweek, prefix="dow").astype(float)
    model = LinearRegression().fit(X, background.values)
    cols = X.columns

    def predict(d: pd.Timestamp) -> float:
        x = (
            pd.get_dummies(pd.Index([d.dayofweek]), prefix="dow")
            .astype(float)
            .reindex(columns=cols, fill_value=0.0)
        )
        return float(model.predict(x)[0])

    return predict


def _schedule_recurring(charges: list[dict], start, end) -> dict:
    """Place les charges récurrentes (débits) sur les dates futures de la fenêtre."""
    out: dict = {}
    for c in charges:
        step = FREQ_DAYS.get(c["frequence"])
        if not step:
            continue
        amount = -abs(c["dernier_montant"])  # un débit = flux négatif
        d = pd.to_datetime(c["prochaine_date"]).normalize()
        while d < start:  # avance jusqu'à la fenêtre de prévision
            d += pd.Timedelta(days=step)
        while d <= end:
            out[d] = out.get(d, 0.0) + amount
            d += pd.Timedelta(days=step)
    return out


def _schedule_tax_deadlines(deadlines: list[dict], start, end) -> dict:
    """Place les échéances fiscales/sociales (décaissements) sur leurs dates futures."""
    out: dict = {}
    for d in deadlines or []:
        day = pd.to_datetime(d.get("date"), errors="coerce")
        if pd.isna(day):
            continue
        day = day.normalize()
        if start <= day <= end:
            out[day] = out.get(day, 0.0) - abs(float(d.get("amount", 0.0)))
    return out


def _schedule_inflows(inflows: list[dict] | None, start, end) -> dict:
    """Place les encaissements attendus (entrées positives) sur leurs dates futures."""
    out: dict = {}
    for d in inflows or []:
        day = pd.to_datetime(d.get("date"), errors="coerce")
        if pd.isna(day):
            continue
        day = day.normalize()
        if start <= day <= end:
            out[day] = out.get(day, 0.0) + abs(float(d.get("amount", 0.0)))
    return out


def build_forecast(
    transactions: list[dict],
    opening_balance: float = 0.0,
    tax_deadlines: list[dict] | None = None,
    expected_inflows: list[dict] | None = None,
    today: date | None = None,
) -> dict:
    if not transactions:
        return _empty()

    df = pd.DataFrame(transactions)
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    df = df.dropna(subset=["date", "amount"])
    if df.empty:
        return _empty()

    # Le solde bancaire inclut les virements internes. Ils ne sont retirés
    # qu'ensuite, pour ne pas les traiter comme des revenus ou des dépenses.
    solde_actuel = opening_balance + float(df["amount"].sum())
    last_date = df["date"].max().normalize()
    analysis_df = df
    if "is_transfer" in analysis_df.columns:
        analysis_df = analysis_df[
            ~analysis_df["is_transfer"].fillna(False).astype(bool)
        ].copy()
    if analysis_df.empty:
        return {**_empty(), "solde_actuel": round(solde_actuel, 2)}
    df = analysis_df
    # La projection démarre AUJOURD'HUI (pas à la dernière transaction) : si les
    # données ont du retard, « 90 jours » et « alerte 30 jours » restent ancrés
    # sur le présent au lieu de décrire une fenêtre déjà passée.
    today_timestamp = pd.Timestamp(today or date.today()).normalize()
    start = max(last_date + pd.Timedelta(days=1), today_timestamp)
    end = start + pd.Timedelta(days=HORIZON - 1)
    future_dates = pd.date_range(start, end)

    # Série quotidienne historique (jours sans transaction = 0)
    daily = df.groupby(df["date"].dt.normalize())["amount"].sum()
    daily = daily.reindex(
        pd.date_range(df["date"].min().normalize(), last_date), fill_value=0.0
    )

    # Charges récurrentes (débits) → on les retire du flux de fond
    recurring = detect_recurring(transactions)
    recurring_keys = {c["key"] for c in recurring["charges"]}
    df["key"] = df["merchant"].apply(merchant_key)
    recurring_daily = (
        df[df["key"].isin(recurring_keys)]
        .groupby(df["date"].dt.normalize())["amount"]
        .sum()
        .reindex(daily.index, fill_value=0.0)
    )
    background = daily - recurring_daily

    predict_background = _fit_background(background)
    recurring_future = _schedule_recurring(recurring["charges"], start, end)
    tax_future = _schedule_tax_deadlines(tax_deadlines, start, end)
    inflow_future = _schedule_inflows(expected_inflows, start, end)
    resid_std = float(background.std()) if len(background) > 1 else 0.0

    # Projection jour par jour : solde = solde + cumsum(flux)
    serie = []
    balance = solde_actuel
    for i, d in enumerate(future_dates, start=1):
        balance += (
            predict_background(d)
            + recurring_future.get(d, 0.0)
            + tax_future.get(d, 0.0)
            + inflow_future.get(d, 0.0)
        )
        marge = resid_std * (i**0.5)  # l'incertitude s'élargit avec l'horizon
        serie.append({
            "date": d.strftime("%Y-%m-%d"),
            "solde": round(balance, 2),
            "borne_basse": round(balance - marge, 2),
            "borne_haute": round(balance + marge, 2),
        })

    # Détection de découvert (sur la projection centrale)
    premier = next((r for r in serie if r["solde"] < 0), None)
    premier_date = premier["date"] if premier else None
    alerte_30j = bool(
        premier and (pd.to_datetime(premier_date) - start).days <= 30
    )

    return {
        "solde_actuel": round(solde_actuel, 2),
        "serie": serie,
        "premier_decouvert": premier_date,
        "solde_min": round(min(r["solde"] for r in serie), 2),
        "alerte_30j": alerte_30j,
    }
