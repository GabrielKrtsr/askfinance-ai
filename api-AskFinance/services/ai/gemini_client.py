"""Client HTTP pour l'Interactions API de Gemini, côté serveur uniquement.

Cette API (style « Responses ») attend un tableau `input` d'items typés et
renvoie soit `output_text`, soit une liste `steps` pouvant contenir des appels
d'outils (`function_call`). Deux niveaux d'usage :
- `run_interaction(...)` : appel bas niveau (texte + appels d'outils + id),
- `generate_text(...)` : raccourci pour une simple question/réponse sans outil.
"""
from __future__ import annotations

import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class GeminiConfigurationError(RuntimeError):
    """La configuration Gemini est absente ou incomplète."""


class GeminiCallError(RuntimeError):
    """L'appel à Gemini a échoué."""


def _model_candidates() -> list[str]:
    primary = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash")
    fallback_raw = os.environ.get("GEMINI_FALLBACK_MODELS", "gemini-3.1-flash-lite")
    models = [primary]
    models.extend(model.strip() for model in fallback_raw.split(",") if model.strip())
    return list(dict.fromkeys(models))


def _is_retryable_http_error(status_code: int, detail: str) -> bool:
    retryable_codes = {429, 500, 502, 503, 504}
    if status_code in retryable_codes:
        return True
    return "high demand" in detail.lower() or "try again later" in detail.lower()


# --- Construction des items d'entrée (format Interactions API) ---

def user_input_item(text: str) -> dict:
    """Message utilisateur."""
    return {"type": "user_input", "content": [{"type": "text", "text": text}]}


def function_result_item(call_id: str, name: str, result_text: str) -> dict:
    """Résultat d'un outil renvoyé au modèle, relié à l'appel par `call_id`."""
    return {
        "type": "function_result",
        "name": name,
        "call_id": call_id,
        "result": [{"type": "text", "text": result_text}],
    }


def history_item(role: str, content: str) -> dict:
    """Tour passé réinjecté dans l'historique (mode stateless).

    user      -> `user_input`
    assistant -> `model_output` (forme symétrique au tour utilisateur).
    NB : la forme exacte de `model_output` réinjecté est à confirmer dans l'API
    reference si l'appel live échoue — c'est le seul point non vérifié, et il est
    isolé ici.
    """
    item_type = "model_output" if role == "assistant" else "user_input"
    return {"type": item_type, "content": [{"type": "text", "text": content}]}


# --- Lecture de la réponse ---

def _extract_output_text(payload: dict) -> str:
    if isinstance(payload.get("output_text"), str):
        return payload["output_text"].strip()

    fragments: list[str] = []
    for step in payload.get("steps", []) or []:
        for content in step.get("content", []) or []:
            text = content.get("text")
            if isinstance(text, str):
                fragments.append(text)
    return "\n".join(fragments).strip()


def _extract_function_calls(payload: dict) -> list[dict]:
    calls: list[dict] = []
    for step in payload.get("steps", []) or []:
        if step.get("type") != "function_call":
            continue
        arguments = step.get("arguments")
        if isinstance(arguments, str):
            try:
                arguments = json.loads(arguments)
            except json.JSONDecodeError:
                arguments = {}
        calls.append({
            "id": step.get("id"),
            "name": step.get("name"),
            "arguments": arguments or {},
        })
    return calls


def _call_model(endpoint: str, api_key: str, model: str, body: dict) -> dict:
    request = Request(
        endpoint,
        data=json.dumps(dict(body, model=model)).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=45) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        error = GeminiCallError(f"Gemini HTTP {exc.code} avec {model}: {detail}")
        error.retryable = _is_retryable_http_error(exc.code, detail)  # type: ignore[attr-defined]
        raise error from exc
    except (TimeoutError, URLError, json.JSONDecodeError) as exc:
        error = GeminiCallError(f"Appel Gemini impossible avec {model}: {exc}")
        error.retryable = True  # type: ignore[attr-defined]
        raise error from exc

    text = _extract_output_text(payload)
    function_calls = _extract_function_calls(payload)
    if not text and not function_calls:
        error = GeminiCallError(f"Gemini n'a renvoye aucun contenu exploitable avec {model}.")
        error.retryable = True  # type: ignore[attr-defined]
        raise error
    return {
        "text": text,
        "function_calls": function_calls,
        "interaction_id": payload.get("id"),
    }


def run_interaction(
    system_instruction: str,
    input_items: list[dict],
    tools: list[dict] | None = None,
    previous_interaction_id: str | None = None,
) -> dict:
    """Appel bas niveau à l'Interactions API, avec modèle principal puis fallbacks.

    Renvoie : {"text": str, "function_calls": list, "interaction_id": str | None}.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise GeminiConfigurationError("GEMINI_API_KEY est manquante dans l'environnement API.")

    endpoint = os.environ.get(
        "GEMINI_API_URL",
        "https://generativelanguage.googleapis.com/v1beta/interactions",
    )

    body: dict = {
        "system_instruction": system_instruction,
        "input": input_items,
        "generation_config": {
            "temperature": 0.35,
            "thinking_level": "low",
            "tool_choice": "auto",
        },
        "store": True,  # active previous_interaction_id (état serveur entre les tours)
    }
    if tools:
        body["tools"] = tools
    if previous_interaction_id:
        body["previous_interaction_id"] = previous_interaction_id

    last_error: GeminiCallError | None = None
    for model in _model_candidates():
        try:
            return _call_model(endpoint, api_key, model, body)
        except GeminiCallError as exc:
            last_error = exc
            print(f"[gemini] {exc}", flush=True)
            if not getattr(exc, "retryable", False):
                break

    raise GeminiCallError(
        "Gemini est temporairement indisponible. Merci de reessayer dans quelques instants."
    ) from last_error


def generate_text(system_instruction: str, user_input: str) -> str:
    """Raccourci : une question, une réponse texte, sans outil."""
    return run_interaction(system_instruction, [user_input_item(user_input)])["text"]


# --- Streaming (SSE) ---

def _translate_stream_event(event_type: str | None, data: dict) -> list[dict]:
    """Traduit un événement SSE de l'Interactions API en événement interne."""
    if event_type == "interaction.created":
        iid = (data.get("interaction") or {}).get("id")
        return [{"kind": "interaction_id", "id": iid}] if iid else []
    if event_type == "step.start":
        step = data.get("step") or {}
        if step.get("type") == "function_call":
            args = step.get("arguments")
            if isinstance(args, str):
                try:
                    args = json.loads(args)
                except json.JSONDecodeError:
                    args = {}
            return [{
                "kind": "function_call",
                "id": step.get("id"),
                "name": step.get("name"),
                "arguments": args or {},
            }]
        return [{"kind": "step_start", "step_type": step.get("type")}]
    if event_type == "step.delta":
        delta = data.get("delta") or {}
        if delta.get("type") == "text" and isinstance(delta.get("text"), str):
            return [{"kind": "text", "text": delta["text"]}]
        return []
    if event_type == "interaction.completed":
        status = (data.get("interaction") or {}).get("status")
        return [{"kind": "status", "status": status}]
    if event_type == "error":
        err = data.get("error") or {}
        return [{"kind": "error", "message": err.get("message", "Erreur Gemini"), "code": err.get("code")}]
    return []


def stream_interaction(
    system_instruction: str,
    input_items: list[dict],
    tools: list[dict] | None = None,
    previous_interaction_id: str | None = None,
):
    """Version streaming de run_interaction. Générateur d'événements internes :
    interaction_id / step_start / function_call / text / status / error / done.
    Pas de fallback de modèle (on ne change pas de modèle en plein flux)."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        yield {"kind": "error", "message": "GEMINI_API_KEY est manquante dans l'environnement API."}
        return

    endpoint = os.environ.get(
        "GEMINI_API_URL",
        "https://generativelanguage.googleapis.com/v1beta/interactions",
    )

    body: dict = {
        "model": _model_candidates()[0],
        "system_instruction": system_instruction,
        "input": input_items,
        "generation_config": {
            "temperature": 0.35,
            "thinking_level": "low",
            "tool_choice": "auto",
        },
        "store": True,
        "stream": True,
    }
    if tools:
        body["tools"] = tools
    if previous_interaction_id:
        body["previous_interaction_id"] = previous_interaction_id

    request = Request(
        endpoint,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
        method="POST",
    )

    try:
        response = urlopen(request, timeout=120)
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        yield {"kind": "error", "message": f"Gemini HTTP {exc.code}: {detail}"}
        return
    except (TimeoutError, URLError) as exc:
        yield {"kind": "error", "message": f"Appel Gemini impossible: {exc}"}
        return

    event_name: str | None = None
    with response:
        for raw in response:
            line = raw.decode("utf-8", "replace").rstrip("\r\n")
            if not line:
                continue
            if line.startswith("event:"):
                event_name = line[6:].strip()
            elif line.startswith("data:"):
                payload = line[5:].strip()
                if payload == "[DONE]":
                    yield {"kind": "done"}
                    continue
                try:
                    data = json.loads(payload)
                except json.JSONDecodeError:
                    continue
                event_type = data.get("event_type") or event_name
                for event in _translate_stream_event(event_type, data):
                    yield event
