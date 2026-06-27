"""Endpoint d'appariement automatique des virements internes."""
from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException

from services.supabase_service import (
    fetch_transactions_full,
    flag_transfers,
    get_user_id,
)
from services.transfers import detect_transfer_pairs

router = APIRouter()


@router.post("/detect-transfers")
def post_detect_transfers(authorization: str = Header(default="")):
    token = authorization.removeprefix("Bearer ").strip()
    user_id = get_user_id(token) if token else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Token invalide ou manquant.")

    rows = fetch_transactions_full(user_id)
    ids = detect_transfer_pairs(rows)
    flagged = flag_transfers(ids)
    return {"flagged": flagged}
