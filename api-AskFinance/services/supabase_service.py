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
    """Valide le JWT auprès de Supabase et renvoie l'id (sub) de l'utilisateur,
    ou None si le token est invalide/expiré."""
    try:
        response = _client().auth.get_user(access_token)
    except Exception as exc:
        # On rend l'erreur visible dans le terminal pour le débogage
        print(f"[auth] échec de get_user : {exc}", flush=True)
        return None
    if response is None or response.user is None:
        return None
    return response.user.id


def fetch_transactions(user_id: str) -> list[dict]:
    """Récupère toutes les transactions d'un utilisateur (pour l'analyse)."""
    response = (
        _client()
        .table("transactions")
        .select("date, merchant, category, amount, type, is_transfer")
        .eq("user_id", user_id)
        .order("date", desc=False)
        .execute()
    )
    return response.data or []


def fetch_transactions_for_ai(user_id: str, limit: int = 120) -> list[dict]:
    """Recupere les dernieres transactions utiles au copilote IA."""
    response = (
        _client()
        .table("transactions")
        .select("date, merchant, category, account, amount, type, status, is_transfer")
        .eq("user_id", user_id)
        .order("date", desc=True)
        .limit(limit)
        .execute()
    )
    return response.data or []


def fetch_budgets(user_id: str) -> list[dict]:
    """Recupere les budgets de l'utilisateur."""
    response = (
        _client()
        .table("budgets")
        .select("category, amount")
        .eq("user_id", user_id)
        .execute()
    )
    return response.data or []


def fetch_tax_settings(user_id: str) -> dict | None:
    """Réglages du coffre-fort fiscal (taux de provision + périodicités), ou None
    si l'utilisateur ne les a pas encore configurés."""
    response = (
        _client()
        .table("tax_settings")
        .select(
            "provision_tva_taux, provision_social_taux, provision_is_taux, "
            "tva_periodicite, urssaf_periodicite"
        )
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    return (response.data or [None])[0]


def fetch_transactions_full(user_id: str) -> list[dict]:
    """Transactions avec id et compte (pour l'appariement des virements)."""
    response = (
        _client()
        .table("transactions")
        .select("id, date, merchant, amount, type, account_id, is_transfer")
        .eq("user_id", user_id)
        .execute()
    )
    return response.data or []


def flag_transfers(transaction_ids: list[str]) -> int:
    """Marque les transactions données comme virements internes."""
    if not transaction_ids:
        return 0
    (
        _client()
        .table("transactions")
        .update({"is_transfer": True})
        .in_("id", transaction_ids)
        .execute()
    )
    return len(transaction_ids)


def create_import(user_id: str, account_id: str, filename: str | None) -> dict | None:
    """Crée un lot d'import et renvoie sa ligne (avec son id)."""
    response = (
        _client()
        .table("imports")
        .insert({
            "user_id": user_id,
            "account_id": account_id,
            "filename": filename,
            "count": 0,
        })
        .execute()
    )
    return (response.data or [None])[0]


def update_import_count(import_id: str, count: int) -> None:
    _client().table("imports").update({"count": count}).eq("id", import_id).execute()


def delete_import(import_id: str) -> None:
    """Supprime un lot (et, par cascade SQL, ses transactions)."""
    _client().table("imports").delete().eq("id", import_id).execute()


def list_accounts(user_id: str) -> list[dict]:
    """Récupère les comptes d'un utilisateur (id, nom, solde d'ouverture)."""
    response = (
        _client()
        .table("accounts")
        .select("id, name, opening_balance")
        .eq("user_id", user_id)
        .execute()
    )
    return response.data or []


def insert_transactions(records: list[dict]) -> int:
    """Insère les transactions en ignorant les doublons
    (contrainte unique user_id + fingerprint). Renvoie le nombre réellement inséré."""
    if not records:
        return 0
    response = (
        _client()
        .table("transactions")
        .upsert(
            records,
            on_conflict="user_id,account_id,fingerprint",
            ignore_duplicates=True,
        )
        .execute()
    )
    return len(response.data or [])


# --- Conversations du copilote IA ---

def create_conversation(user_id: str, title: str | None) -> dict | None:
    """Crée une conversation et renvoie sa ligne (avec son id)."""
    response = (
        _client()
        .table("conversations")
        .insert({"user_id": user_id, "title": title})
        .execute()
    )
    return (response.data or [None])[0]


def conversation_belongs_to_user(conversation_id: str, user_id: str) -> bool:
    """Vérifie qu'une conversation appartient bien à l'utilisateur (sécurité)."""
    response = (
        _client()
        .table("conversations")
        .select("id")
        .eq("id", conversation_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    return bool(response.data)


def fetch_recent_messages(conversation_id: str, limit: int = 10) -> list[dict]:
    """Derniers messages d'une conversation (fenêtre de contexte), renvoyés en
    ordre chronologique pour être réinjectés au LLM."""
    response = (
        _client()
        .table("messages")
        .select("role, content, created_at")
        .eq("conversation_id", conversation_id)
        .order("created_at", desc=True)
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
