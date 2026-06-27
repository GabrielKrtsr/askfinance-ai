"""Endpoint du coffre-fort fiscal (provision recommandée + échéances)."""
from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException

from services.supabase_service import (
    fetch_tax_settings,
    fetch_transactions,
    get_user_id,
)
from services.tax import build_tax_vault

router = APIRouter()


@router.get("/tax-vault")
def get_tax_vault(authorization: str = Header(default="")):
    token = authorization.removeprefix("Bearer ").strip()
    user_id = get_user_id(token) if token else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Token invalide ou manquant.")

    transactions = fetch_transactions(user_id)
    settings = fetch_tax_settings(user_id)
    return build_tax_vault(transactions, settings)
