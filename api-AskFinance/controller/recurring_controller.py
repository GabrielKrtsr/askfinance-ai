"""Endpoint de détection des charges récurrentes."""
from __future__ import annotations

from fastapi import APIRouter, Header

from controller.deps import require_member
from services.recurring import detect_recurring
from services.supabase_service import fetch_transactions

router = APIRouter()


@router.get("/recurring")
def get_recurring(
    authorization: str = Header(default=""),
    x_workspace_id: str = Header(default=""),
):
    _, workspace_id = require_member(authorization, x_workspace_id)
    return detect_recurring(fetch_transactions(workspace_id))
