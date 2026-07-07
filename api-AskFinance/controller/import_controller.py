"""Endpoint d'import (historisation) d'un relevé bancaire CSV."""
from __future__ import annotations

from fastapi import APIRouter, File, Form, Header, HTTPException, UploadFile

from services.csv_parser import parse_transactions
from services.supabase_service import (
    create_import,
    delete_import,
    get_account_workspace,
    get_user_id,
    insert_transactions,
    update_import_count,
    user_is_member,
)

router = APIRouter()


@router.post("/import")
async def import_releve(
    file: UploadFile = File(...),
    account_id: str = Form(...),
    authorization: str = Header(default=""),
):
    # 1. Authentification : on attend l'en-tête "Authorization: Bearer <access_token>"
    token = authorization.removeprefix("Bearer ").strip()
    user_id = get_user_id(token) if token else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Token invalide ou manquant.")

    # 1bis. Le compte détermine l'espace ; l'utilisateur doit en être membre actif.
    #       (Garde manuelle : la SERVICE_ROLE_KEY contourne la RLS.)
    workspace_id = get_account_workspace(account_id)
    if not workspace_id or not user_is_member(workspace_id, user_id):
        raise HTTPException(status_code=403, detail="Compte introuvable ou accès refusé.")

    # 2. Lecture + parsing du CSV (pandas)
    content = await file.read()
    try:
        result = parse_transactions(content, workspace_id, account_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # 3. Créer un lot d'import et taguer chaque transaction (pour pouvoir l'annuler)
    batch = create_import(workspace_id, account_id, file.filename)
    import_id = batch["id"] if batch else None
    for record in result.records:
        record["import_id"] = import_id

    # 4. Insertion en base (dédoublonnage géré par la contrainte unique)
    inserted = insert_transactions(result.records)

    # 5. Finaliser le lot : compter, ou le supprimer si rien n'a été inséré
    if import_id:
        if inserted > 0:
            update_import_count(workspace_id, import_id, inserted)
        else:
            delete_import(workspace_id, import_id)

    duplicates = result.in_file_duplicates + (len(result.records) - inserted)
    return {
        "inserted": inserted,
        "duplicates": duplicates,
        "skipped": result.skipped,
    }
