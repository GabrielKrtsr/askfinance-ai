"""Tests de non-régression des calculs financiers critiques."""
from __future__ import annotations

import unittest
from datetime import date

from services.forecast import build_forecast
from services.receivables import reconcile_receivables
from services.recurring import detect_recurring
from services.transfers import detect_transfer_pairs
from services.ai.tools import tool_declarations_for


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


if __name__ == "__main__":
    unittest.main()
