"""Tests du traitement direct des imports, sans Redis ni Celery."""
from __future__ import annotations

import unittest
from unittest.mock import patch

from services import import_service
from services.csv_parser import ParseResult


class DirectImportTests(unittest.TestCase):
    def test_success_applies_rules_and_cleans_temporary_file(self):
        records = [
            {
                "label": "OpenAI ChatGPT",
                "category": "Non catégorisé",
                "category_source": "import",
                "category_confidence": None,
            }
        ]
        parsed = ParseResult(records=records, skipped=2, in_file_duplicates=0)

        with (
            patch.object(import_service, "download_import_file", return_value=b"csv"),
            patch.object(import_service, "parse_transactions", return_value=parsed),
            patch.object(
                import_service,
                "fetch_category_rules",
                return_value={"openai chatgpt": "Logiciels"},
            ),
            patch.object(import_service, "create_import", return_value={"id": "import-1"}),
            patch.object(import_service, "insert_transactions", return_value=1) as insert,
            patch.object(import_service, "update_import_count") as update_count,
            patch.object(import_service, "delete_import") as delete_import,
            patch.object(import_service, "delete_import_file") as delete_file,
        ):
            result = import_service.process_csv_import(
                "user/file.csv", "file.csv", "workspace-1", "account-1"
            )

        self.assertEqual(result, {"inserted": 1, "duplicates": 0, "skipped": 2})
        self.assertEqual(records[0]["category"], "Logiciels")
        self.assertEqual(records[0]["category_source"], "rule")
        self.assertEqual(records[0]["import_id"], "import-1")
        insert.assert_called_once_with(records)
        update_count.assert_called_once_with("workspace-1", "import-1", 1)
        delete_import.assert_not_called()
        delete_file.assert_called_once_with("user/file.csv")

    def test_database_failure_rolls_back_batch_and_cleans_file(self):
        parsed = ParseResult(records=[{"label": "ACME"}], skipped=0, in_file_duplicates=0)

        with (
            patch.object(import_service, "download_import_file", return_value=b"csv"),
            patch.object(import_service, "parse_transactions", return_value=parsed),
            patch.object(import_service, "fetch_category_rules", return_value={}),
            patch.object(import_service, "create_import", return_value={"id": "import-2"}),
            patch.object(
                import_service,
                "insert_transactions",
                side_effect=RuntimeError("base indisponible"),
            ),
            patch.object(import_service, "delete_import") as delete_import,
            patch.object(import_service, "delete_import_file") as delete_file,
        ):
            with self.assertRaisesRegex(RuntimeError, "base indisponible"):
                import_service.process_csv_import(
                    "user/file.csv", "file.csv", "workspace-1", "account-1"
                )

        delete_import.assert_called_once_with("workspace-1", "import-2")
        delete_file.assert_called_once_with("user/file.csv")

    def test_oversized_file_is_rejected_and_cleaned(self):
        content = b"x" * (import_service.MAX_IMPORT_SIZE_BYTES + 1)

        with (
            patch.object(import_service, "download_import_file", return_value=content),
            patch.object(import_service, "parse_transactions") as parse,
            patch.object(import_service, "delete_import_file") as delete_file,
        ):
            with self.assertRaisesRegex(ValueError, "10 Mo"):
                import_service.process_csv_import(
                    "user/large.csv", "large.csv", "workspace-1", "account-1"
                )

        parse.assert_not_called()
        delete_file.assert_called_once_with("user/large.csv")


if __name__ == "__main__":
    unittest.main()
