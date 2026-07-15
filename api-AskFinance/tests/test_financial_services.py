"""Tests de non-régression des calculs financiers critiques."""
from __future__ import annotations

import unittest
from datetime import date

from services.forecast import build_forecast
from services.receivables import reconcile_receivables
from services.recurring import detect_recurring
from services.transfers import detect_transfer_pairs
from services.ai.tools import (
    _build_kpis,
    _filter_period,
    _period_required_response,
    _parse_month,
    _resolve_period,
    _spending_by_category,
    tool_declarations_for,
)
from services.ai.orchestrator import (
    _accepted_spending_month,
    _format_verified_spending,
    _next_pending_action,
)


class ForecastTests(unittest.TestCase):
    def test_internal_transfer_is_kept_in_bank_balance(self):
        result = build_forecast(
            [
                {
                    "date": "2026-07-01",
                    "merchant": "Virement vers épargne",
                    "amount": -250,
                    "type": "debit",
                    "is_transfer": True,
                }
            ],
            opening_balance=1_000,
        )
        self.assertEqual(result["solde_actuel"], 750)

    def test_two_sided_internal_transfer_has_zero_consolidated_effect(self):
        transactions = [
            {
                "date": "2026-07-01",
                "merchant": "Virement interne",
                "amount": -250,
                "type": "debit",
                "is_transfer": True,
            },
            {
                "date": "2026-07-01",
                "merchant": "Virement interne",
                "amount": 250,
                "type": "credit",
                "is_transfer": True,
            },
        ]
        self.assertEqual(build_forecast(transactions, 1_000)["solde_actuel"], 1_000)


class RecurringTests(unittest.TestCase):
    def test_monthly_charge_is_detected(self):
        transactions = [
            {"date": "2026-04-05", "merchant": "PRLV ACME 001", "amount": -30, "type": "debit"},
            {"date": "2026-05-05", "merchant": "PRLV ACME 002", "amount": -30, "type": "debit"},
            {"date": "2026-06-05", "merchant": "PRLV ACME 003", "amount": -30, "type": "debit"},
        ]
        result = detect_recurring(transactions)
        self.assertEqual(len(result["charges"]), 1)
        self.assertEqual(result["charges"][0]["frequence"], "mensuel")


class ReceivableTests(unittest.TestCase):
    def test_expected_payment_matches_real_credit(self):
        expected = [{"id": "r1", "client": "ACME", "amount": 1200, "due_date": "2026-06-15"}]
        transactions = [
            {
                "date": "2026-06-17",
                "merchant": "VIR ACME FACTURE 42",
                "amount": 1200,
                "type": "credit",
                "is_transfer": False,
            }
        ]
        result = reconcile_receivables(expected, transactions, today=date(2026, 7, 1))
        self.assertEqual(result["receivables"][0]["statut"], "received")

    def test_manual_payment_confirmation_wins_without_bank_match(self):
        expected = [{"id": "r2", "client": "ACME", "amount": 800, "paid_amount": 800, "due_date": "2026-06-15", "status": "received", "received_at": "2026-06-20"}]
        result = reconcile_receivables(expected, [], today=date(2026, 7, 1))
        self.assertEqual(result["receivables"][0]["statut"], "received")
        self.assertEqual(result["total_attendu"], 0)

    def test_partial_payment_only_keeps_remaining_amount_due(self):
        expected = [{"id": "r3", "client": "ACME", "amount": 1000, "paid_amount": 400, "due_date": "2026-06-15", "status": "partial"}]
        result = reconcile_receivables(expected, [], today=date(2026, 7, 1))
        self.assertEqual(result["receivables"][0]["statut"], "partial")
        self.assertEqual(result["total_attendu"], 600)


class TransferTests(unittest.TestCase):
    def test_pair_between_two_accounts_is_detected(self):
        rows = [
            {"id": "a", "date": "2026-07-01", "merchant": "VIREMENT INTERNE", "amount": -500, "type": "debit", "account_id": "one", "is_transfer": False},
            {"id": "b", "date": "2026-07-02", "merchant": "VIREMENT INTERNE", "amount": 500, "type": "credit", "account_id": "two", "is_transfer": False},
        ]
        self.assertEqual(set(detect_transfer_pairs(rows)), {"a", "b"})


class CopilotScopeTests(unittest.TestCase):
    def test_personal_space_does_not_expose_business_only_tools(self):
        names = {tool["name"] for tool in tool_declarations_for("personal")}
        self.assertNotIn("get_tax_vault", names)
        self.assertNotIn("get_overdue_receivables", names)
        self.assertIn("get_budgets", names)


class CopilotPeriodTests(unittest.TestCase):
    transactions = [
        {"date": "2026-06-02", "category": "Logement", "amount": -918, "is_transfer": False},
        {"date": "2026-06-08", "category": "Alimentation", "amount": -435.11, "is_transfer": False},
        {"date": "2026-06-28", "category": "Salaire", "amount": 2_980, "is_transfer": False},
    ]

    def test_current_month_does_not_fall_back_to_latest_available_month(self):
        resolved = _resolve_period(
            self.transactions,
            period="current_month",
            today=date(2026, 7, 14),
        )
        self.assertEqual(resolved["mois"], "2026-07")
        self.assertEqual(resolved["derniere_periode_disponible"], "2026-06")
        self.assertEqual(_filter_period(self.transactions, resolved), [])

    def test_missing_period_requires_a_clarifying_question(self):
        result = _period_required_response(self.transactions)
        self.assertEqual(result["statut"], "periode_requise")
        self.assertIsNone(result["periode"])
        self.assertFalse(result["donnees_disponibles"])
        self.assertEqual(result["derniere_periode_disponible"], "2026-06")

    def test_short_yes_uses_structured_pending_action(self):
        pending = {
            "type": "tool_confirmation",
            "tool": "get_spending_by_category",
            "arguments": {"period": "specific_month", "month": "2026-06"},
        }
        self.assertEqual(
            _accepted_spending_month("oui !", pending_action=pending), "2026-06"
        )

    def test_natural_confirmation_with_month_reuses_the_offered_year(self):
        pending = {
            "type": "tool_confirmation",
            "tool": "get_spending_by_category",
            "arguments": {"period": "specific_month", "month": "2026-06"},
        }
        self.assertEqual(
            _accepted_spending_month(
                "oui prend le moi de juin", pending_action=pending
            ),
            "2026-06",
        )

    def test_tool_accepts_a_french_month_label(self):
        self.assertEqual(_parse_month("juin 2026"), date(2026, 6, 1))

    def test_explicit_spending_question_is_resolved_without_history(self):
        self.assertEqual(
            _accepted_spending_month("Où part mon argent pour le mois de juin 2026 ?"),
            "2026-06",
        )

    def test_verified_spending_is_formatted_without_model_interpretation(self):
        answer = _format_verified_spending({
            "month": "2026-06",
            "result": {
                "donnees_disponibles": True,
                "total_depenses": "1 793,23 EUR",
                "depenses_par_categorie": [
                    {"categorie": "Logement", "montant": "918,00 EUR"},
                ],
            },
        })
        self.assertIn("1 793,23 €", answer)
        self.assertIn("Logement", answer)
        self.assertNotIn("aucune", answer.casefold())

    def test_yes_is_not_reinterpreted_without_a_monthly_spending_proposal(self):
        self.assertIsNone(_accepted_spending_month("oui"))

    def test_empty_month_creates_a_structured_confirmation(self):
        pending = _next_pending_action({
            "month": "2026-07",
            "result": {
                "donnees_disponibles": False,
                "derniere_periode_disponible": "2026-06",
            },
        })
        self.assertEqual(pending["tool"], "get_spending_by_category")
        self.assertEqual(pending["arguments"]["month"], "2026-06")

    def test_specific_month_only_aggregates_that_month(self):
        resolved = _resolve_period(
            self.transactions,
            period="specific_month",
            month="2026-06",
            today=date(2026, 7, 14),
        )
        rows = _spending_by_category(_filter_period(self.transactions, resolved))
        self.assertEqual(rows[0], {"categorie": "Logement", "montant": "918,00 EUR"})
        self.assertEqual(rows[1], {"categorie": "Alimentation", "montant": "435,11 EUR"})

    def test_kpis_report_missing_current_month_instead_of_june_values(self):
        result = _build_kpis(
            self.transactions,
            opening_balance=0,
            period="current_month",
            today=date(2026, 7, 14),
        )
        self.assertFalse(result["donnees_disponibles"])
        self.assertEqual(result["periode"], "2026-07")
        self.assertEqual(result["derniere_periode_disponible"], "2026-06")
        self.assertIsNone(result["revenus"])
        self.assertIsNone(result["depenses"])

    def test_historical_kpis_use_the_balance_at_the_end_of_the_period(self):
        rows = [
            {"date": "2026-03-10", "amount": 1_000, "is_transfer": False},
            {"date": "2026-03-12", "amount": -200, "is_transfer": False},
            {"date": "2026-06-01", "amount": 5_000, "is_transfer": False},
        ]
        result = _build_kpis(
            rows,
            opening_balance=100,
            period="specific_month",
            month="2026-03",
            today=date(2026, 7, 14),
        )
        self.assertEqual(result["solde_tresorerie"], "900,00 EUR")
        self.assertEqual(result["solde_au"], "2026-03-12")


if __name__ == "__main__":
    unittest.main()
