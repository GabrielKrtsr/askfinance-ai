"""Normalisation de la langue de réponse du copilote."""
from __future__ import annotations

from typing import Literal

Language = Literal["fr", "en", "uk"]


def normalize_language(value: str | None) -> Language:
    return value if value in {"fr", "en", "uk"} else "fr"


def response_language_instruction(value: str | None) -> str:
    language = normalize_language(value)
    instructions = {
        "fr": (
            "Réponds toujours en français. Cette règle de langue est prioritaire "
            "sur la langue de l'historique, mais ne modifie jamais les données."
        ),
        "en": (
            "Always answer in English. This language rule overrides any earlier "
            "instruction asking for French and the language used in conversation history. "
            "Keep imported labels unchanged unless a standard category has an obvious translation."
        ),
        "uk": (
            "Завжди відповідай українською мовою. Це правило має пріоритет над будь-якою "
            "попередньою вимогою відповідати французькою та над мовою історії розмови. "
            "Не змінюй значення даних під час перекладу."
        ),
    }
    return "\n\n## Langue de réponse obligatoire\n" + instructions[language]
