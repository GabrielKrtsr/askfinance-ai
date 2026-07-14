"""Import direct d'un relevé CSV depuis le stockage temporaire privé."""
from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from services.import_service import process_csv_import
from services.supabase_service import (
    get_account_workspace,
    get_user_id,
    user_can_edit_workspace,
)

router = APIRouter()


class ImportRequest(BaseModel):
    account_id: str
    storage_path: str
    filename: str


def _authenticated_user(authorization: str) -> str:
    token = authorization.removeprefix("Bearer ").strip()
    user_id = get_user_id(token) if token else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Token invalide ou manquant.")
    return user_id


@router.post("/import")
def import_releve(
    payload: ImportRequest,
    authorization: str = Header(default=""),
):
    user_id = _authenticated_user(authorization)

    workspace_id = get_account_workspace(payload.account_id)
    if not workspace_id or not user_can_edit_workspace(workspace_id, user_id):
        raise HTTPException(status_code=403, detail="Compte introuvable ou accès refusé.")

    # Le front ne peut soumettre que son propre dossier dans le bucket privé.
    if not payload.storage_path.startswith(f"{user_id}/"):
        raise HTTPException(status_code=403, detail="Chemin de fichier non autorisé.")

    try:
        return process_csv_import(
            payload.storage_path,
            payload.filename,
            workspace_id,
            payload.account_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        print(f"[import] échec du traitement : {exc}", flush=True)
        raise HTTPException(
            status_code=500,
            detail="L'import a échoué. Réessayez ou vérifiez le format du fichier.",
        ) from exc
