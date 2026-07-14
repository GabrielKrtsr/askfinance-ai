"""Orchestrateur du copilote IA : un agent unique à boucle d'outils.

Deux modes :
- `answer_financial_question` : non-streaming (réponse complète d'un coup) ;
- `stream_financial_answer` : streaming (étapes + texte au fil de l'eau, pour SSE).

Déroulé commun :
1. assemble le system prompt (socle commun + persona) ;
2. réinjecte l'historique récent (mémoire multi-tours) ;
3. laisse Gemini choisir les outils (classification d'intention via function-calling) ;
4. exécute les outils, renvoie leurs résultats au modèle ;
5. recommence jusqu'à la réponse finale (borné par MAX_TOOL_ROUNDS).
"""
from __future__ import annotations

import json

from services.ai.gemini_client import (
    GeminiCallError,
    function_result_item,
    generate_text,
    history_item,
    run_interaction,
    stream_interaction,
    user_input_item,
)
from services.ai.personas import normalize_persona
from services.ai.prompts import build_system_prompt
from services.ai.tools import (
    build_full_context,
    run_tool,
    tool_status_label,
    tool_declarations_for,
)

MAX_TOOL_ROUNDS = 4


def answer_financial_question(
    workspace_id: str,
    message: str,
    persona_id: str,
    history: list[dict] | None = None,
    workspace_type: str = "business",
) -> dict:
    """Point d'entrée non-streaming : applique le persona, fait tourner l'agent."""
    persona = normalize_persona(persona_id)
    system = build_system_prompt(persona, workspace_type)
    history = history or []
    try:
        answer = _run_agent_loop(workspace_id, message, system, history, workspace_type)
    except GeminiCallError:
        answer = _fallback_single_call(workspace_id, message, system, history, workspace_type)
    return {"answer": answer, "advisor": persona}


def stream_financial_answer(
    workspace_id: str,
    message: str,
    persona_id: str,
    history: list[dict] | None = None,
    workspace_type: str = "business",
):
    """Point d'entrée streaming. Générateur d'événements pour l'endpoint SSE :
      {"kind": "step", "label": ...}   pendant l'appel d'un outil
      {"kind": "token", "text": ...}   morceaux de la réponse finale
      {"kind": "error", "message": ...}
    """
    persona = normalize_persona(persona_id)
    system = build_system_prompt(persona, workspace_type)
    history = history or []
    input_items = _history_items(history) + [user_input_item(message)]
    tool_declarations = tool_declarations_for(workspace_type)
    previous_id: str | None = None
    produced_text = False

    for _ in range(MAX_TOOL_ROUNDS):
        pending: list[dict] = []
        for event in stream_interaction(
            system, input_items, tools=tool_declarations, previous_interaction_id=previous_id
        ):
            kind = event["kind"]
            if kind == "interaction_id":
                previous_id = event["id"]
            elif kind == "function_call":
                pending.append(event)
                yield {"kind": "step", "label": tool_status_label(event["name"])}
            elif kind == "text":
                produced_text = True
                yield {"kind": "token", "text": event["text"]}
            elif kind == "error":
                yield {"kind": "error", "message": event["message"]}
                return

        if not pending:
            return  # réponse finale déjà streamée

        input_items = [
            function_result_item(
                call["id"],
                call["name"],
                json.dumps(run_tool(call["name"], workspace_id, call.get("arguments")), ensure_ascii=False),
            )
            for call in pending
        ]

    if not produced_text:
        yield {"kind": "token", "text": _empty_answer()}


def _history_items(history: list[dict]) -> list[dict]:
    """Convertit les tours stockés en items d'entrée pour l'Interactions API."""
    return [
        history_item(str(turn.get("role", "user")), str(turn.get("content", "")))
        for turn in history
        if turn.get("content")
    ]


def _run_agent_loop(workspace_id: str, message: str, system: str, history: list[dict], workspace_type: str) -> str:
    """Boucle agent non-streaming : le modèle appelle des outils tant qu'il en a besoin."""
    input_items = _history_items(history) + [user_input_item(message)]
    previous_id: str | None = None
    tool_declarations = tool_declarations_for(workspace_type)

    for _ in range(MAX_TOOL_ROUNDS):
        result = run_interaction(
            system,
            input_items,
            tools=tool_declarations,
            previous_interaction_id=previous_id,
        )
        previous_id = result.get("interaction_id")
        calls = result.get("function_calls") or []
        if not calls:
            return result.get("text") or _empty_answer()

        input_items = [
            function_result_item(
                call["id"],
                call["name"],
                json.dumps(run_tool(call["name"], workspace_id, call.get("arguments")), ensure_ascii=False),
            )
            for call in calls
        ]

    result = run_interaction(system, input_items, tools=None, previous_interaction_id=previous_id)
    return result.get("text") or _empty_answer()


def _fallback_single_call(workspace_id: str, message: str, system: str, history: list[dict], workspace_type: str) -> str:
    """Repli : un seul appel, tout le contexte injecté (ancien comportement)."""
    context = build_full_context(workspace_id, workspace_type)
    parts = ["Question utilisateur :", message, ""]
    if history:
        parts += [
            "Historique recent de la conversation :",
            "\n".join(f"{turn.get('role')}: {turn.get('content')}" for turn in history),
            "",
        ]
    parts += [
        "Contexte financier disponible (JSON, limite a cet utilisateur) :",
        json.dumps(context, ensure_ascii=False, indent=2),
        "",
        "Reponds comme un copilote de tresorerie. Si une donnee manque, dis-le clairement.",
    ]
    return generate_text(system, "\n".join(parts))


def _empty_answer() -> str:
    return "Je n'ai pas pu produire de reponse exploitable pour le moment. Pouvez-vous reformuler ?"
