"""Personas (métadonnées) du copilote IA.

Les instructions détaillées de chaque persona vivent dans `prompt/persona_*.md`
et sont assemblées par `services.ai.prompts`. Ce module ne garde que les
métadonnées exposées au front (`/ai/advisors`) et la normalisation du choix.
"""
from __future__ import annotations

from typing import Literal

AdvisorId = Literal["controleur", "daf", "croissance"]


PERSONAS: dict[str, dict[str, str]] = {
    "controleur": {
        "label": "Prudence",
        "description": "Risques, decouvert, charges fixes. Securiser la tresorerie.",
    },
    "daf": {
        "label": "Pilotage",
        "description": "Marge, rentabilite, arbitrages. Piloter les decisions.",
    },
    "croissance": {
        "label": "Croissance",
        "description": "Opportunites, optimisation, scenarios de developpement.",
    },
}


def normalize_persona(value: str | None) -> str:
    """Renvoie un persona connu, avec Le DAF comme choix par défaut."""
    if value in PERSONAS:
        return value
    return "daf"
