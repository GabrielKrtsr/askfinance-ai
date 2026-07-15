"""Tests du transport stateless entre Gemini et les outils financiers."""
from __future__ import annotations

import os
import unittest
from datetime import date
from unittest.mock import Mock, patch

from services.ai.gemini_client import run_interaction, user_input_item
from services.ai.orchestrator import (
    _accepted_spending_month,
    _format_verified_spending,
    _run_agent_loop,
)
from services.ai.prompts import build_system_prompt


class GeminiStatelessTests(unittest.TestCase):
    def test_interactions_are_not_stored_by_google(self):
        response = Mock()
        response.status_code = 200
        response.text = ""
        response.json.return_value = {"output_text": "Réponse", "steps": []}
        client = Mock()
        client.post.return_value = response

        with patch.dict(os.environ, {"GEMINI_API_KEY": "test"}, clear=False), patch(
            "services.ai.gemini_client._http_client", return_value=client
        ):
            result = run_interaction("système", [user_input_item("question")])

        self.assertEqual(result["text"], "Réponse")
        body = client.post.call_args.kwargs["json"]
        self.assertIs(body["store"], False)
        self.assertNotIn("previous_interaction_id", body)

    def test_function_call_and_result_are_resent_on_the_next_round(self):
        function_step = {
            "type": "function_call",
            "id": "call-1",
            "name": "get_spending_by_category",
            "arguments": {
                "period": "specific_month",
                "month": "2026-06",
            },
        }
        first = {
            "text": "",
            "function_calls": [{
                "id": "call-1",
                "name": "get_spending_by_category",
                "arguments": function_step["arguments"],
            }],
            "steps": [function_step],
        }
        second = {"text": "Réponse vérifiée", "function_calls": [], "steps": []}

        with patch(
            "services.ai.orchestrator.run_interaction",
            side_effect=[first, second],
        ) as interaction, patch(
            "services.ai.orchestrator.run_tool",
            return_value={"total_depenses": "1 793,23 EUR"},
        ):
            answer = _run_agent_loop(
                "workspace",
                "Dépenses de juin 2026",
                "système",
                [],
                "personal",
            )

        self.assertEqual(answer, "Réponse vérifiée")
        second_input = interaction.call_args_list[1].args[1]
        self.assertIn(function_step, second_input)
        result_steps = [item for item in second_input if item.get("type") == "function_result"]
        self.assertEqual(result_steps[0]["call_id"], "call-1")


class AiLanguageTests(unittest.TestCase):
    def test_english_spending_question_resolves_named_month(self):
        with patch("services.ai.orchestrator.app_today", return_value=date(2026, 7, 15)):
            month = _accepted_spending_month("Where did my money go in June?")

        self.assertEqual(month, "2026-06")

    def test_ukrainian_spending_question_resolves_named_month(self):
        with patch("services.ai.orchestrator.app_today", return_value=date(2026, 7, 15)):
            month = _accepted_spending_month("Куди пішли мої гроші у червні?")

        self.assertEqual(month, "2026-06")

    def test_english_confirmation_reuses_pending_month(self):
        pending = {
            "type": "tool_confirmation",
            "tool": "get_spending_by_category",
            "arguments": {"period": "specific_month", "month": "2026-06"},
        }

        self.assertEqual(_accepted_spending_month("Yes", pending_action=pending), "2026-06")

    def test_verified_spending_is_formatted_in_english(self):
        context = {
            "month": "2026-06",
            "result": {
                "donnees_disponibles": True,
                "total_depenses": "1 793,23 EUR",
                "depenses_par_categorie": [
                    {"categorie": "Logement et immobilier", "montant": "918,00 EUR"},
                    {"categorie": "Alimentation", "montant": "435,11 EUR"},
                ],
            },
        }

        answer = _format_verified_spending(context, "en")

        self.assertIn("In **June 2026**", answer)
        self.assertIn("**€1,793.23**", answer)
        self.assertIn("**Housing and real estate**: €918.00", answer)
        self.assertNotIn("vos dépenses", answer)

    def test_system_prompt_enforces_selected_language_last(self):
        prompt = build_system_prompt("daf", "personal", "en")

        self.assertIn("Always answer in English", prompt)
        self.assertTrue(prompt.rstrip().endswith(
            "Keep imported labels unchanged unless a standard category has an obvious translation."
        ))


if __name__ == "__main__":
    unittest.main()
