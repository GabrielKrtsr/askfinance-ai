"""Endpoints du copilote IA Gemini."""
from __future__ import annotations

import json

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from services.ai.gemini_client import GeminiCallError, GeminiConfigurationError
from services.ai.orchestrator import answer_financial_question, stream_financial_answer
from services.ai.personas import PERSONAS
from services.supabase_service import (
    conversation_belongs_to_user,
    create_conversation,
    fetch_recent_messages,
    get_user_id,
    insert_message,
)

router = APIRouter()

# Nombre de messages passés réinjectés comme contexte (fenêtre glissante).
HISTORY_WINDOW = 10


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    advisor: str = "daf"
    conversation_id: str | None = None


def _title_from(message: str) -> str:
    """Titre court d'une nouvelle conversation, à partir du premier message."""
    title = message.strip().splitlines()[0]
    return title[:60] + ("…" if len(title) > 60 else "")


def _resolve_conversation(user_id: str, message: str, conversation_id: str | None) -> str:
    """Vérifie l'appartenance d'une conversation, ou en crée une neuve. Renvoie son id."""
    if conversation_id:
        if not conversation_belongs_to_user(conversation_id, user_id):
            raise HTTPException(status_code=404, detail="Conversation introuvable.")
        return conversation_id
    conversation = create_conversation(user_id, _title_from(message))
    if not conversation:
        raise HTTPException(status_code=500, detail="Impossible de créer la conversation.")
    return conversation["id"]


def _user_id_or_401(authorization: str) -> str:
    token = authorization.removeprefix("Bearer ").strip()
    user_id = get_user_id(token) if token else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Token invalide ou manquant.")
    return user_id


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


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
def chat(payload: ChatRequest, authorization: str = Header(default="")):
    """Réponse complète (non-streaming) — repli si le front ne gère pas le SSE."""
    user_id = _user_id_or_401(authorization)
    message = payload.message.strip()

    conversation_id = _resolve_conversation(user_id, message, payload.conversation_id)
    history = fetch_recent_messages(conversation_id, HISTORY_WINDOW)
    insert_message(conversation_id, user_id, "user", message)

    try:
        result = answer_financial_question(user_id, message, payload.advisor, history)
    except GeminiConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except GeminiCallError as exc:
        print(f"[ai] echec Gemini: {exc}", flush=True)
        raise HTTPException(
            status_code=502,
            detail="Gemini est temporairement indisponible. Merci de réessayer dans quelques instants.",
        ) from exc

    insert_message(conversation_id, user_id, "assistant", result["answer"])
    return {**result, "conversation_id": conversation_id}


@router.post("/chat/stream")
def chat_stream(payload: ChatRequest, authorization: str = Header(default="")):
    """Réponse en streaming (SSE) : étapes en cours + texte token-par-token.

    Événements SSE émis : `meta` (conversation_id), `step` (libellé d'étape),
    `token` (morceau de texte), `error`, `done`.
    """
    user_id = _user_id_or_401(authorization)
    message = payload.message.strip()

    conversation_id = _resolve_conversation(user_id, message, payload.conversation_id)
    history = fetch_recent_messages(conversation_id, HISTORY_WINDOW)
    insert_message(conversation_id, user_id, "user", message)

    def event_stream():
        yield _sse("meta", {"conversation_id": conversation_id})
        parts: list[str] = []
        try:
            for event in stream_financial_answer(user_id, message, payload.advisor, history):
                kind = event["kind"]
                if kind == "step":
                    yield _sse("step", {"label": event["label"]})
                elif kind == "token":
                    parts.append(event["text"])
                    yield _sse("token", {"text": event["text"]})
                elif kind == "error":
                    yield _sse("error", {"message": event["message"]})
        except Exception as exc:  # noqa: BLE001 — on protège le flux quoi qu'il arrive
            print(f"[ai] stream echec: {exc}", flush=True)
            yield _sse("error", {"message": "Erreur interne du copilote."})

        answer = "".join(parts).strip()
        if answer:
            insert_message(conversation_id, user_id, "assistant", answer)
        yield _sse("done", {})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # désactive le buffering (proxys/uvicorn)
            "Connection": "keep-alive",
        },
    )
