"""Endpoints du copilote IA Gemini."""
from __future__ import annotations

import time
from collections import defaultdict
from threading import Lock

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from controller.deps import require_member
from services.ai.gemini_client import GeminiCallError, GeminiConfigurationError
from services.ai.language import normalize_language
from services.ai.orchestrator import answer_financial_question
from services.ai.personas import PERSONAS
from services.supabase_service import (
    conversation_belongs_to_user,
    create_conversation,
    fetch_pending_action,
    fetch_recent_messages,
    insert_message,
    get_workspace_type,
    set_pending_action,
)

router = APIRouter()

# Nombre de messages passés réinjectés comme contexte (fenêtre glissante).
HISTORY_WINDOW = 10

# Garde-fou anti-abus : chaque appel Gemini coûte. Fenêtre glissante en mémoire,
# par utilisateur (best-effort : remis à zéro au redémarrage du process).
RATE_LIMIT_WINDOW_SECONDS = 300
RATE_LIMIT_MAX_REQUESTS = 20
_rate_lock = Lock()
_rate_hits: dict[str, list[float]] = defaultdict(list)


def _check_rate_limit(user_id: str) -> None:
    now = time.monotonic()
    with _rate_lock:
        hits = [t for t in _rate_hits[user_id] if now - t < RATE_LIMIT_WINDOW_SECONDS]
        if len(hits) >= RATE_LIMIT_MAX_REQUESTS:
            _rate_hits[user_id] = hits
            raise HTTPException(
                status_code=429,
                detail="Trop de requêtes au copilote. Réessayez dans quelques minutes.",
            )
        hits.append(now)
        _rate_hits[user_id] = hits


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    advisor: str = "daf"
    conversation_id: str | None = None
    language: str = Field(default="fr", pattern="^(fr|en|uk)$")


def _title_from(message: str) -> str:
    """Titre court d'une nouvelle conversation, à partir du premier message."""
    title = message.strip().splitlines()[0]
    return title[:60] + ("…" if len(title) > 60 else "")


def _resolve_conversation(
    workspace_id: str, user_id: str, message: str, conversation_id: str | None
) -> str:
    """Vérifie l'appartenance d'une conversation (utilisateur ET espace courant),
    ou en crée une neuve. Renvoie son id."""
    if conversation_id:
        if not conversation_belongs_to_user(conversation_id, user_id, workspace_id):
            raise HTTPException(status_code=404, detail="Conversation introuvable.")
        return conversation_id
    conversation = create_conversation(workspace_id, user_id, _title_from(message))
    if not conversation:
        raise HTTPException(status_code=500, detail="Impossible de créer la conversation.")
    return conversation["id"]


@router.get("/advisors")
def list_advisors():
    return {
        "advisors": [
            {
                "id": key,
                "label": value["label"],
                "description": value["description"],
            }
            for key, value in PERSONAS.items()
        ]
    }


@router.post("/chat")
def chat(
    payload: ChatRequest,
    authorization: str = Header(default=""),
    x_workspace_id: str = Header(default=""),
):
    """Réponse complète. Le frontend anime ensuite localement son affichage."""
    user_id, workspace_id = require_member(authorization, x_workspace_id)
    workspace_type = get_workspace_type(workspace_id)
    if workspace_type == "group":
        raise HTTPException(status_code=400, detail="Yassia n'est pas encore disponible dans les espaces de groupe.")
    _check_rate_limit(user_id)
    message = payload.message.strip()
    language = normalize_language(payload.language)

    conversation_id = _resolve_conversation(
        workspace_id, user_id, message, payload.conversation_id
    )
    history = fetch_recent_messages(conversation_id, HISTORY_WINDOW)
    pending_action = fetch_pending_action(conversation_id, user_id, workspace_id)
    insert_message(conversation_id, user_id, "user", message)

    try:
        result = answer_financial_question(
            workspace_id,
            message,
            payload.advisor,
            history,
            workspace_type,
            pending_action=pending_action,
            language=language,
        )
    except GeminiConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except GeminiCallError as exc:
        print(f"[ai] echec Gemini: {exc}", flush=True)
        raise HTTPException(
            status_code=502,
            detail="Gemini est temporairement indisponible. Merci de réessayer dans quelques instants.",
        ) from exc

    insert_message(conversation_id, user_id, "assistant", result["answer"])
    set_pending_action(
        conversation_id,
        user_id,
        workspace_id,
        result.pop("pending_action", None),
    )
    return {**result, "conversation_id": conversation_id}
