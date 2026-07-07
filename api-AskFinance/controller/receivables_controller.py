"""Endpoint des encaissements attendus (échéancier déclaré + rapprochement)."""
from __future__ import annotations

from fastapi import APIRouter, Header

from controller.deps import require_member
from services.receivables import reconcile_receivables
from services.supabase_service import fetch_expected_receivables, fetch_transactions

router = APIRouter()


@router.get("/receivables")
def get_receivables(
    authorization: str = Header(default=""),
    x_workspace_id: str = Header(default=""),
):
    _, workspace_id = require_member(authorization, x_workspace_id)
    return reconcile_receivables(
        fetch_expected_receivables(workspace_id), fetch_transactions(workspace_id)
    )
