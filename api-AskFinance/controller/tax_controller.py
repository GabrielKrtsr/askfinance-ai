"""Endpoint du coffre-fort fiscal (provision recommandée + échéances)."""
from __future__ import annotations

from fastapi import APIRouter, Header

from controller.deps import require_member
from services.supabase_service import fetch_tax_settings, fetch_transactions
from services.tax import build_tax_vault

router = APIRouter()


@router.get("/tax-vault")
def get_tax_vault(
    authorization: str = Header(default=""),
    x_workspace_id: str = Header(default=""),
):
    _, workspace_id = require_member(authorization, x_workspace_id)
    return build_tax_vault(
        fetch_transactions(workspace_id), fetch_tax_settings(workspace_id)
    )
