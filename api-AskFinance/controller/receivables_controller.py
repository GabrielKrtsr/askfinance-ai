"""Endpoint du radar des encaissements (recettes récurrentes + retards)."""
from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException

from services.receivables import detect_receivables
from services.supabase_service import fetch_transactions, get_user_id

router = APIRouter()


@router.get("/receivables")
def get_receivables(authorization: str = Header(default="")):
    token = authorization.removeprefix("Bearer ").strip()
    user_id = get_user_id(token) if token else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Token invalide ou manquant.")

    transactions = fetch_transactions(user_id)
    return detect_receivables(transactions)
