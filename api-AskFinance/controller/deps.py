"""Dépendance partagée des contrôleurs : garde d'appartenance à un espace.

Le front envoie l'en-tête `X-Workspace-Id`. Comme l'API utilise la
SERVICE_ROLE_KEY (qui contourne la RLS), on vérifie ici, à la main, que
l'utilisateur du token est bien membre actif de cet espace.
"""
from __future__ import annotations

import time

from fastapi import HTTPException

from services.supabase_service import (
    get_user_id,
    user_can_edit_workspace,
    user_is_member,
)

# Cache court des appartenances CONFIRMÉES : évite un aller-retour Supabase par
# requête quand le même utilisateur enchaîne les appels (ex. page Pilotage).
# On ne met jamais en cache un refus : un membre tout juste activé ne doit pas
# attendre l'expiration du cache pour accéder à son espace.
_MEMBERSHIP_TTL_SECONDS = 60
_MEMBERSHIP_MAX_ENTRIES = 1024
_membership_cache: dict[tuple[str, str], float] = {}


def _is_member_cached(workspace_id: str, user_id: str) -> bool:
    key = (workspace_id, user_id)
    now = time.monotonic()
    cached_at = _membership_cache.get(key)
    if cached_at is not None and now - cached_at < _MEMBERSHIP_TTL_SECONDS:
        return True
    if not user_is_member(workspace_id, user_id):
        return False
    if len(_membership_cache) >= _MEMBERSHIP_MAX_ENTRIES:
        _membership_cache.clear()  # purge grossière, suffisant à cette échelle
    _membership_cache[key] = now
    return True


def require_member(authorization: str, workspace_id: str) -> tuple[str, str]:
    token = authorization.removeprefix("Bearer ").strip()
    user_id = get_user_id(token) if token else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Token invalide ou manquant.")
    if not workspace_id:
        raise HTTPException(status_code=400, detail="Espace (workspace) manquant.")
    if not _is_member_cached(workspace_id, user_id):
        raise HTTPException(status_code=403, detail="Accès refusé à cet espace.")
    return user_id, workspace_id


def require_editor(authorization: str, workspace_id: str) -> tuple[str, str]:
    """Comme require_member, mais interdit les mutations au rôle viewer."""
    user_id, checked_workspace_id = require_member(authorization, workspace_id)
    if not user_can_edit_workspace(checked_workspace_id, user_id):
        raise HTTPException(status_code=403, detail="Accès en lecture seule.")
    return user_id, checked_workspace_id
