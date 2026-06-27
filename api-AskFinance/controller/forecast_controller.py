"""Endpoint de prévision de trésorerie (30/60/90 jours)."""
from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Header, HTTPException

from services.forecast import build_forecast
from services.supabase_service import (
    fetch_tax_settings,
    fetch_transactions,
    get_user_id,
    list_accounts,
)
from services.tax import tax_deadlines_for_forecast

router = APIRouter()


@router.get("/forecast")
def get_forecast(authorization: str = Header(default="")):
    token = authorization.removeprefix("Bearer ").strip()
    user_id = get_user_id(token) if token else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Token invalide ou manquant.")

    opening = sum(float(a["opening_balance"]) for a in list_accounts(user_id))
    transactions = fetch_transactions(user_id)
    # Les échéances fiscales/sociales paramétrées sont injectées dans la prévision
    # (couvre largement la fenêtre de 90 j même si elle démarre après aujourd'hui).
    settings = fetch_tax_settings(user_id)
    deadlines = tax_deadlines_for_forecast(
        transactions, settings, date.today(), date.today() + timedelta(days=200)
    )
    return build_forecast(transactions, opening, tax_deadlines=deadlines)
