"""Traitement direct et atomique d'un relevé CSV stocké temporairement."""
from __future__ import annotations

from services.csv_parser import parse_transactions
from services.supabase_service import (
    create_import,
    delete_import,
    delete_import_file,
    download_import_file,
    fetch_category_rules,
    insert_transactions,
    update_import_count,
)


MAX_IMPORT_SIZE_BYTES = 10 * 1024 * 1024


def process_csv_import(
    storage_path: str,
    filename: str,
    workspace_id: str,
    account_id: str,
) -> dict:
    """Télécharge, parse et insère un relevé sans file de travaux externe.

    Le fichier Storage est toujours supprimé. Si une erreur survient après la
    création du lot, sa suppression annule aussi les transactions déjà insérées
    grâce à la cascade SQL.
    """
    import_id: str | None = None
    try:
        content = download_import_file(storage_path)
        if len(content) > MAX_IMPORT_SIZE_BYTES:
            raise ValueError("Le fichier dépasse la limite autorisée de 10 Mo.")

        result = parse_transactions(content, workspace_id, account_id)

        # Les corrections passées deviennent des règles déterministes appliquées
        # avant l'insertion, sans appel LLM.
        category_rules = fetch_category_rules(workspace_id)
        for record in result.records:
            learned = category_rules.get(str(record.get("label") or "").strip().casefold())
            if learned:
                record["category"] = learned
                record["category_source"] = "rule"
                record["category_confidence"] = 1

        batch = create_import(workspace_id, account_id, filename)
        import_id = batch["id"] if batch else None
        for record in result.records:
            record["import_id"] = import_id

        inserted = insert_transactions(result.records)

        if import_id:
            if inserted > 0:
                update_import_count(workspace_id, import_id, inserted)
            else:
                delete_import(workspace_id, import_id)
                import_id = None

        duplicates = result.in_file_duplicates + (len(result.records) - inserted)
        return {
            "inserted": inserted,
            "duplicates": duplicates,
            "skipped": result.skipped,
        }
    except Exception:
        if import_id:
            try:
                delete_import(workspace_id, import_id)
            except Exception as rollback_error:
                print(
                    f"[import] annulation du lot impossible : {rollback_error}",
                    flush=True,
                )
        raise
    finally:
        delete_import_file(storage_path)
