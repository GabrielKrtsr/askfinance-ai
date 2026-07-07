"""Dépendance partagée des contrôleurs : garde d'appartenance à un espace.

Le front envoie l'en-tête `X-Workspace-Id`. Comme l'API utilise la
SERVICE_ROLE_KEY (qui contourne la RLS), on vérifie ici, à la main, que
l'utilisateur du token est bien membre actif de cet espace.
"""
from __future__ import annotations

from fastapi import HTTPException

from services.supabase_service import get_user_id, user_is_member


def require_member(authorization: str, workspace_id: str) -> tuple[str, str]:
    token = authorization.removeprefix("Bearer ").strip()
    user_id = get_user_id(token) if token else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Token invalide ou manquant.")
    if not workspace_id:
        raise HTTPException(status_code=400, detail="Espace (workspace) manquant.")
    if not user_is_member(workspace_id, user_id):
        raise HTTPException(status_code=403, detail="Accès refusé à cet espace.")
    return user_id, workspace_id
