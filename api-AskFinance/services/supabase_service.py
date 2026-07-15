"""Accès Supabase : validation du token utilisateur + insertion des transactions."""
from __future__ import annotations

import os
from functools import lru_cache

from supabase import Client, create_client


@lru_cache
def _client() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]  # clé secrète, serveur uniquement
    return create_client(url, key)


def get_user_id(access_token: str) -> str | None:
    """Vérifie le JWT et renvoie l'id (sub) de l'utilisateur, ou None si invalide.

    `get_claims` vérifie la signature **localement** (JWKS mis en cache par le
    client) quand le projet utilise des clés asymétriques → zéro aller-retour
    réseau par requête. Pour un projet legacy signé en HS256, la lib retombe
    d'elle-même sur l'appel réseau `get_user` : le comportement reste correct."""
    try:
        response = _client().auth.get_claims(access_token)
    except Exception as exc:
        # On rend l'erreur visible dans le terminal pour le débogage
        print(f"[auth] token rejeté : {exc}", flush=True)
        return None
    if not response:
        return None
    sub = response["claims"].get("sub")
    return str(sub) if sub else None


def get_account_workspace(account_id: str) -> str | None:
    """Renvoie l'espace (workspace_id) auquel appartient un compte, ou None."""
    response = (
        _client()
        .table("accounts")
        .select("workspace_id")
        .eq("id", account_id)
        .limit(1)
        .execute()
    )
    row = (response.data or [None])[0]
    return row["workspace_id"] if row else None


def get_workspace_type(workspace_id: str) -> str:
    response = _client().table("workspaces").select("type").eq("id", workspace_id).limit(1).execute()
    row = (response.data or [{}])[0]
    return str(row.get("type") or "business")


def user_is_member(workspace_id: str, user_id: str) -> bool:
    """Vrai si l'utilisateur est membre ACTIF de l'espace.
    ⚠️ Indispensable côté Python : la SERVICE_ROLE_KEY contourne la RLS,
    la garde d'appartenance doit donc être faite à la main."""
    response = (
        _client()
        .table("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspace_id)
        .eq("user_id", user_id)
        .eq("status", "active")
        .limit(1)
        .execute()
    )
    return bool(response.data)


def user_can_edit_workspace(workspace_id: str, user_id: str) -> bool:
    """Vrai pour owner/admin/member actifs ; un viewer reste en lecture seule."""
    response = (
        _client()
        .table("workspace_members")
        .select("role")
        .eq("workspace_id", workspace_id)
        .eq("user_id", user_id)
        .eq("status", "active")
        .in_("role", ["owner", "admin", "member"])
        .limit(1)
        .execute()
    )
    return bool(response.data)


# Les colonnes en base sont `label`/`direction` (schéma anglais) ; les services
# d'analyse et les outils IA attendent `merchant`/`type` → on remappe à la lecture.

TRANSACTION_PAGE_SIZE = 1_000


def _fetch_all_transaction_rows(workspace_id: str, columns: str) -> list[dict]:
    """Parcourt explicitement toutes les pages PostgREST.

    La limite Supabase est généralement de 1 000 lignes. L'ordre date + id rend
    les pages déterministes, y compris quand plusieurs opérations ont la même date.
    """
    rows: list[dict] = []
    offset = 0
    while True:
        response = (
            _client()
            .table("transactions")
            .select(columns)
            .eq("workspace_id", workspace_id)
            .order("date", desc=False)
            .order("id", desc=False)
            .range(offset, offset + TRANSACTION_PAGE_SIZE - 1)
            .execute()
        )
        page = response.data or []
        rows.extend(page)
        if len(page) < TRANSACTION_PAGE_SIZE:
            return rows
        offset += TRANSACTION_PAGE_SIZE

def fetch_transactions(workspace_id: str) -> list[dict]:
    """Toutes les transactions d'un espace (pour l'analyse)."""
    rows = _fetch_all_transaction_rows(
        workspace_id,
        "date, label, category, amount, direction, is_transfer",
    )
    return [
        {
            "date": r.get("date"),
            "merchant": r.get("label"),
            "category": r.get("category"),
            "amount": r.get("amount"),
            "type": r.get("direction"),
            "is_transfer": r.get("is_transfer"),
        }
        for r in rows
    ]


def fetch_transactions_for_ai(workspace_id: str, limit: int = 120) -> list[dict]:
    """Dernieres transactions d'un espace, utiles au copilote IA."""
    response = (
        _client()
        .table("transactions")
        .select("date, label, category, amount, direction, status, is_transfer")
        .eq("workspace_id", workspace_id)
        .order("date", desc=True)
        .limit(limit)
        .execute()
    )
    return [
        {
            "date": r.get("date"),
            "merchant": r.get("label"),
            "category": r.get("category"),
            "account": None,
            "amount": r.get("amount"),
            "type": r.get("direction"),
            "status": r.get("status"),
            "is_transfer": r.get("is_transfer"),
        }
        for r in (response.data or [])
    ]


def fetch_budgets(workspace_id: str) -> list[dict]:
    """Budgets mensuels d'un espace."""
    try:
        response = (
            _client()
            .table("budgets")
            .select("category, amount, month")
            .eq("workspace_id", workspace_id)
            .order("month", desc=True)
            .execute()
        )
        return response.data or []
    except Exception as exc:
        # Compatibilité temporaire avec les bases où la migration des budgets
        # mensuels n'a pas encore été appliquée. La période reste volontairement
        # absente : on ne l'invente pas depuis created_at.
        if "budgets.month does not exist" not in str(exc):
            raise
        legacy = (
            _client()
            .table("budgets")
            .select("category, amount")
            .eq("workspace_id", workspace_id)
            .execute()
        )
        return [{**row, "month": None} for row in (legacy.data or [])]


def fetch_expected_receivables(workspace_id: str) -> list[dict]:
    """Encaissements clients attendus (déclarés dans l'espace)."""
    response = (
        _client()
        .table("expected_receivables")
        .select("id, client, invoice_number, contact_email, amount, paid_amount, due_date, status, received_at, matched_transaction_id")
        .eq("workspace_id", workspace_id)
        .order("due_date", desc=False)
        .execute()
    )
    return response.data or []


def fetch_tax_settings(workspace_id: str) -> dict | None:
    """Réglages du coffre-fort fiscal de l'espace, ou None si non configuré."""
    response = (
        _client()
        .table("tax_settings")
        .select(
            "vat_provision_rate, social_provision_rate, corporate_tax_provision_rate, "
            "vat_periodicity, urssaf_periodicity"
        )
        .eq("workspace_id", workspace_id)
        .limit(1)
        .execute()
    )
    row = (response.data or [None])[0]
    if not row:
        return None
    # Remap vers les clés attendues par le service `tax`.
    return {
        "provision_tva_taux": row.get("vat_provision_rate"),
        "provision_social_taux": row.get("social_provision_rate"),
        "provision_is_taux": row.get("corporate_tax_provision_rate"),
        "tva_periodicite": row.get("vat_periodicity"),
        "urssaf_periodicite": row.get("urssaf_periodicity"),
    }


def fetch_transactions_full(workspace_id: str) -> list[dict]:
    """Transactions avec id et compte (pour l'appariement des virements)."""
    rows = _fetch_all_transaction_rows(
        workspace_id,
        "id, date, label, amount, direction, account_id, is_transfer",
    )
    return [
        {
            "id": r.get("id"),
            "date": r.get("date"),
            "merchant": r.get("label"),
            "amount": r.get("amount"),
            "type": r.get("direction"),
            "account_id": r.get("account_id"),
            "is_transfer": r.get("is_transfer"),
        }
        for r in rows
    ]


def flag_transfers(workspace_id: str, transaction_ids: list[str]) -> int:
    """Marque les transactions données comme virements internes.
    Filtre workspace_id en défense en profondeur (SERVICE_ROLE = pas de RLS)."""
    if not transaction_ids:
        return 0
    (
        _client()
        .table("transactions")
        .update({"is_transfer": True})
        .eq("workspace_id", workspace_id)
        .in_("id", transaction_ids)
        .execute()
    )
    return len(transaction_ids)


def create_import(workspace_id: str, account_id: str, filename: str | None) -> dict | None:
    """Crée un lot d'import et renvoie sa ligne (avec son id)."""
    response = (
        _client()
        .table("imports")
        .insert({
            "workspace_id": workspace_id,
            "account_id": account_id,
            "filename": filename,
            "count": 0,
        })
        .execute()
    )
    return (response.data or [None])[0]


def update_import_count(workspace_id: str, import_id: str, count: int) -> None:
    (
        _client()
        .table("imports")
        .update({"count": count})
        .eq("workspace_id", workspace_id)
        .eq("id", import_id)
        .execute()
    )


def delete_import(workspace_id: str, import_id: str) -> None:
    """Supprime un lot (et, par cascade SQL, ses transactions)."""
    (
        _client()
        .table("imports")
        .delete()
        .eq("workspace_id", workspace_id)
        .eq("id", import_id)
        .execute()
    )


IMPORT_BUCKET = "transaction-imports"


def download_import_file(storage_path: str) -> bytes:
    """Télécharge un CSV privé depuis Supabase Storage avec la service role."""
    return _client().storage.from_(IMPORT_BUCKET).download(storage_path)


def delete_import_file(storage_path: str) -> None:
    """Supprime sans bruit le fichier temporaire après traitement."""
    try:
        _client().storage.from_(IMPORT_BUCKET).remove([storage_path])
    except Exception as exc:
        print(f"[import] suppression du CSV impossible : {exc}", flush=True)


def list_accounts(workspace_id: str) -> list[dict]:
    """Comptes d'un espace (id, nom, solde d'ouverture)."""
    response = (
        _client()
        .table("accounts")
        .select("id, name, opening_balance")
        .eq("workspace_id", workspace_id)
        .execute()
    )
    return response.data or []


def fetch_category_rules(workspace_id: str) -> dict[str, str]:
    """Règles exactes libellé normalisé -> catégorie apprises dans l'espace."""
    response = (
        _client()
        .table("transaction_category_rules")
        .select("label_key, category")
        .eq("workspace_id", workspace_id)
        .execute()
    )
    return {
        str(row.get("label_key") or ""): str(row.get("category") or "")
        for row in (response.data or [])
        if row.get("label_key") and row.get("category")
    }


def insert_transactions(records: list[dict]) -> int:
    """Insère les transactions en ignorant les doublons
    (contrainte unique user_id + fingerprint). Renvoie le nombre réellement inséré."""
    if not records:
        return 0
    inserted = 0
    # Évite une requête HTTP Supabase gigantesque pour les relevés volumineux.
    for offset in range(0, len(records), 1_000):
        response = (
            _client()
            .table("transactions")
            .upsert(
                records[offset:offset + 1_000],
                on_conflict="workspace_id,account_id,fingerprint",
                ignore_duplicates=True,
            )
            .execute()
        )
        inserted += len(response.data or [])
    return inserted


# --- Conversations du copilote IA ---

def create_conversation(workspace_id: str, user_id: str, title: str | None) -> dict | None:
    """Crée une conversation (rattachée à l'espace + au créateur)."""
    response = (
        _client()
        .table("conversations")
        .insert({"workspace_id": workspace_id, "user_id": user_id, "title": title})
        .execute()
    )
    return (response.data or [None])[0]


def conversation_belongs_to_user(
    conversation_id: str, user_id: str, workspace_id: str
) -> bool:
    """Vérifie qu'une conversation appartient à l'utilisateur ET à l'espace courant
    (sécurité : empêche de mélanger l'historique de deux espaces)."""
    response = (
        _client()
        .table("conversations")
        .select("id")
        .eq("id", conversation_id)
        .eq("user_id", user_id)
        .eq("workspace_id", workspace_id)
        .limit(1)
        .execute()
    )
    return bool(response.data)


def fetch_pending_action(
    conversation_id: str, user_id: str, workspace_id: str
) -> dict | None:
    """Action structurée proposée au tour précédent, si elle existe."""
    try:
        response = (
            _client()
            .table("conversations")
            .select("pending_action")
            .eq("id", conversation_id)
            .eq("user_id", user_id)
            .eq("workspace_id", workspace_id)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        if "pending_action" not in str(exc):
            raise
        print("[ai] migration pending_action non appliquée", flush=True)
        return None
    row = (response.data or [None])[0]
    value = row.get("pending_action") if row else None
    return value if isinstance(value, dict) else None


def set_pending_action(
    conversation_id: str,
    user_id: str,
    workspace_id: str,
    pending_action: dict | None,
) -> None:
    """Remplace ou efface l'action en attente sans analyser le texte du chat."""
    try:
        (
            _client()
            .table("conversations")
            .update({"pending_action": pending_action})
            .eq("id", conversation_id)
            .eq("user_id", user_id)
            .eq("workspace_id", workspace_id)
            .execute()
        )
    except Exception as exc:
        if "pending_action" not in str(exc):
            raise
        print("[ai] migration pending_action non appliquée", flush=True)


def fetch_recent_messages(conversation_id: str, limit: int = 10) -> list[dict]:
    """Derniers messages d'une conversation (fenêtre de contexte), renvoyés en
    ordre chronologique pour être réinjectés au LLM."""
    response = (
        _client()
        .table("messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", conversation_id)
        .order("created_at", desc=True)
        .order("id", desc=True)
        .limit(limit)
        .execute()
    )
    return list(reversed(response.data or []))


def insert_message(conversation_id: str, user_id: str, role: str, content: str) -> None:
    """Enregistre un message (user_id posé depuis le token validé)."""
    (
        _client()
        .table("messages")
        .insert({
            "conversation_id": conversation_id,
            "user_id": user_id,
            "role": role,
            "content": content,
        })
        .execute()
    )
