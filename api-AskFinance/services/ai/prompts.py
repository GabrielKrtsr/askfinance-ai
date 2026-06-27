"""Chargement et assemblage des prompts (.md) du copilote IA.

Le system prompt final = socle commun (savoir métier, règles, outils) + persona.
Les fichiers vivent dans `prompt/`. C'est la SEULE source de vérité des règles
métier côté IA : ne pas les redupliquer dans le code.
"""
from __future__ import annotations

from datetime import date
from functools import lru_cache
from pathlib import Path

# api-AskFinance/prompt  (ce fichier est dans api-AskFinance/services/ai/)
PROMPT_DIR = Path(__file__).resolve().parents[2] / "prompt"

PERSONA_FILES: dict[str, str] = {
    "controleur": "persona_controleur.md",
    "daf": "persona_daf.md",
    "croissance": "persona_croissance.md",
}


@lru_cache
def _read(filename: str) -> str:
    """Lit un fichier prompt (mis en cache : les .md ne changent pas en cours d'exécution)."""
    return (PROMPT_DIR / filename).read_text(encoding="utf-8")


def build_system_prompt(persona_id: str) -> str:
    """Assemble le socle commun + le persona, et injecte le contexte dynamique léger."""
    socle = _read("socle_commun.md")
    persona = _read(PERSONA_FILES.get(persona_id, "persona_daf.md"))
    prompt = "\n\n".join([socle, persona])
    return prompt.replace("{date_du_jour}", date.today().isoformat())
