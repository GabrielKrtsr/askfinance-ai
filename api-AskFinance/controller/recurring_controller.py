"""Endpoint de détection des charges récurrentes."""
from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException

from services.recurring import detect_recurring
from services.supabase_service import fetch_transactions, get_user_id

router = APIRouter()


@router.get("/recurring")
def get_recurring(authorization: str = Header(default="")):
    token = authorization.removeprefix("Bearer ").strip()
    user_id = get_user_id(token) if token else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Token invalide ou manquant.")

    transactions = fetch_transactions(user_id)
    return detect_recurring(transactions)
