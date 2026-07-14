"""Endpoint groupé de la page Pilotage : prévision + récurrents + encaissements.

Un seul appel HTTP au lieu de trois : une seule validation de token, un seul
chargement des transactions, et un seul passage pandas au lieu de trois jobs
concurrents (précieux sur une petite instance).
"""
from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Header

from controller.deps import require_member
from services.forecast import build_forecast
from services.receivables import inflows_for_forecast, reconcile_receivables
from services.recurring import detect_recurring
from services.supabase_service import (
    fetch_expected_receivables,
    fetch_tax_settings,
    fetch_transactions,
    list_accounts,
)
from services.tax import tax_deadlines_for_forecast

router = APIRouter()


@router.get("/pilotage")
def get_pilotage(
    authorization: str = Header(default=""),
    x_workspace_id: str = Header(default=""),
):
    _, workspace_id = require_member(authorization, x_workspace_id)

    # Chargées une seule fois, partagées par les trois analyses.
    transactions = fetch_transactions(workspace_id)
    expected = fetch_expected_receivables(workspace_id)

    opening = sum(float(a["opening_balance"]) for a in list_accounts(workspace_id))
    today = date.today()
    horizon_end = today + timedelta(days=200)
    deadlines = tax_deadlines_for_forecast(
        transactions, fetch_tax_settings(workspace_id), today, horizon_end
    )
    inflows = inflows_for_forecast(expected, transactions, today, horizon_end)

    return {
        "forecast": build_forecast(
            transactions, opening, tax_deadlines=deadlines, expected_inflows=inflows
        ),
        "recurring": detect_recurring(transactions),
        "receivables": reconcile_receivables(expected, transactions),
    }
