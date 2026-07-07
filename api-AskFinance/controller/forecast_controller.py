"""Endpoint de prévision de trésorerie (30/60/90 jours)."""
from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Header

from controller.deps import require_member
from services.forecast import build_forecast
from services.receivables import inflows_for_forecast
from services.supabase_service import (
    fetch_expected_receivables,
    fetch_tax_settings,
    fetch_transactions,
    list_accounts,
)
from services.tax import tax_deadlines_for_forecast

router = APIRouter()


@router.get("/forecast")
def get_forecast(
    authorization: str = Header(default=""),
    x_workspace_id: str = Header(default=""),
):
    _, workspace_id = require_member(authorization, x_workspace_id)

    opening = sum(float(a["opening_balance"]) for a in list_accounts(workspace_id))
    transactions = fetch_transactions(workspace_id)
    # Les échéances fiscales/sociales paramétrées sont injectées dans la prévision.
    horizon_end = date.today() + timedelta(days=200)
    settings = fetch_tax_settings(workspace_id)
    deadlines = tax_deadlines_for_forecast(
        transactions, settings, date.today(), horizon_end
    )
    inflows = inflows_for_forecast(
        fetch_expected_receivables(workspace_id), transactions, date.today(), horizon_end
    )
    return build_forecast(
        transactions, opening, tax_deadlines=deadlines, expected_inflows=inflows
    )
