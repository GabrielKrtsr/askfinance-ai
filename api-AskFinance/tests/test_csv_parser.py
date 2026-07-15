"""Tests des variantes d'en-têtes bancaires acceptées par le parseur CSV."""
from __future__ import annotations

import unittest

from services.csv_parser import parse_transactions


class CsvHeaderAliasesTests(unittest.TestCase):
    def test_english_bank_headers_with_separate_debit_and_credit(self):
        content = (
            "Posting Date;Simplified Description;Transaction Description;Reference;"
            "Category;Debit;Credit\n"
            "28/06/2026;HORIZON WORKSHOP DEMO;SEPA TRANSFER SALARY;REF-1;"
            "Salary & Income;;+2980,00\n"
            "27/06/2026;INTERMARCHE;CARD PURCHASE;REF-2;"
            "Food and groceries;-47,34;\n"
        ).encode("utf-8")

        result = parse_transactions(content, "workspace-1", "account-1")

        self.assertEqual(result.skipped, 0)
        self.assertEqual(len(result.records), 2)
        self.assertEqual(result.records[0]["date"], "2026-06-28")
        self.assertEqual(result.records[0]["label"], "HORIZON WORKSHOP DEMO")
        self.assertEqual(result.records[0]["amount"], 2980.0)
        self.assertEqual(result.records[0]["category"], "Salary & Income")
        self.assertEqual(result.records[1]["amount"], -47.34)

    def test_french_headers_with_currency_and_punctuation(self):
        content = (
            "Date d’opération;Libellé de l’opération;Catégorie;Débit (€);Crédit (€)\n"
            "15/07/2026;LOYER;Logement et immobilier;918,00;\n"
        ).encode("utf-8")

        result = parse_transactions(content, "workspace-1", "account-1")

        self.assertEqual(result.skipped, 0)
        self.assertEqual(len(result.records), 1)
        self.assertEqual(result.records[0]["date"], "2026-07-15")
        self.assertEqual(result.records[0]["label"], "LOYER")
        self.assertEqual(result.records[0]["amount"], -918.0)

    def test_english_single_amount_column(self):
        content = (
            "Transaction Date,Payee,Transaction Amount,Main Category\n"
            "2026-07-14,Cloud hosting,-29.90,Shopping and services\n"
        ).encode("utf-8")

        result = parse_transactions(content, "workspace-1", "account-1")

        self.assertEqual(result.skipped, 0)
        self.assertEqual(len(result.records), 1)
        self.assertEqual(result.records[0]["amount"], -29.9)
        self.assertEqual(result.records[0]["category"], "Shopping and services")


if __name__ == "__main__":
    unittest.main()
