"""Endpoint d'appariement automatique des virements internes."""
from __future__ import annotations

from fastapi import APIRouter, Header

from controller.deps import require_editor
from services.supabase_service import fetch_transactions_full, flag_transfers
from services.transfers import detect_transfer_pairs

router = APIRouter()


@router.post("/detect-transfers")
def post_detect_transfers(
    authorization: str = Header(default=""),
    x_workspace_id: str = Header(default=""),
):
    _, workspace_id = require_editor(authorization, x_workspace_id)

    rows = fetch_transactions_full(workspace_id)
    ids = detect_transfer_pairs(rows)
    return {"flagged": flag_transfers(workspace_id, ids)}
