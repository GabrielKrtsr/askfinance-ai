"""Parsing d'un relevé bancaire CSV en transactions, avec pandas."""
from __future__ import annotations

import io
import unicodedata
from dataclasses import dataclass

import pandas as pd

# Alias de colonnes (comparés après normalisation : minuscules, sans accents).
DATE_ALIASES = [
    "date", "date operation", "date d'operation",
    "date de comptabilisation", "date de valeur",
]
MERCHANT_ALIASES = [
    "libelle simplifie", "libelle operation", "libelle",
    "merchant", "label", "description", "intitule",
]
AMOUNT_ALIASES = ["montant", "amount", "valeur"]
CATEGORY_ALIASES = ["categorie", "category"]
ACCOUNT_ALIASES = ["compte", "account"]
REFERENCE_ALIASES = ["reference", "ref"]


@dataclass
class ParseResult:
    records: list[dict]        # transactions prêtes à insérer
    skipped: int               # lignes invalides (date/libellé/montant manquant)
    in_file_duplicates: int    # doublons à l'intérieur du fichier


def _normalize(name: str) -> str:
    """'Libellé simplifié' -> 'libelle simplifie' (minuscules, sans accents, sans BOM)."""
    name = str(name).replace("﻿", "").strip().lower()
    return "".join(
        c for c in unicodedata.normalize("NFD", name)
        if unicodedata.category(c) != "Mn"
    )


def _first_present(columns: set[str], aliases: list[str]) -> str | None:
    for alias in aliases:
        if alias in columns:
            return alias
    return None


def _to_number(series: pd.Series) -> pd.Series:
    """'-1 234,56 €' ou '-1.234,56' -> -1234.56 (colonne entière d'un coup)."""
    cleaned = (
        series.astype(str)
        .str.replace(r"[\s ]", "", regex=True)  # espaces normaux + insécables
        .str.replace("€", "", regex=False)
        .str.replace("EUR", "", regex=False)
    )
    # Format FR avec point de milliers ("1.234,56") : le point saute, la virgule
    # devient le séparateur décimal. Sans virgule, le point reste décimal ("12.50").
    has_comma = cleaned.str.contains(",", regex=False)
    cleaned = cleaned.where(~has_comma, cleaned.str.replace(".", "", regex=False))
    cleaned = cleaned.str.replace(",", ".", regex=False)
    return pd.to_numeric(cleaned, errors="coerce")


def _read_csv(content: bytes) -> pd.DataFrame:
    """Lit le CSV en auto-détectant le séparateur (',' ou ';') et l'encodage."""
    last_error: Exception | None = None
    for encoding in ("utf-8-sig", "latin-1"):
        try:
            return pd.read_csv(
                io.BytesIO(content),
                sep=None,            # auto-détection du séparateur
                engine="python",
                encoding=encoding,
                dtype=str,
                keep_default_na=False,  # cellules vides -> "" (pas NaN)
            )
        except (UnicodeDecodeError, pd.errors.ParserError) as exc:
            last_error = exc
    raise ValueError(f"Impossible de lire le CSV : {last_error}")


def parse_transactions(
    content: bytes, workspace_id: str, account_id: str
) -> ParseResult:
    df = _read_csv(content)
    df.columns = [_normalize(c) for c in df.columns]
    cols = set(df.columns)

    date_col = _first_present(cols, DATE_ALIASES)
    merchant_col = _first_present(cols, MERCHANT_ALIASES)
    amount_col = _first_present(cols, AMOUNT_ALIASES)
    debit_col = "debit" if "debit" in cols else None
    credit_col = "credit" if "credit" in cols else None
    category_col = _first_present(cols, CATEGORY_ALIASES)
    account_col = _first_present(cols, ACCOUNT_ALIASES)
    reference_col = _first_present(cols, REFERENCE_ALIASES)

    if not date_col or not merchant_col or not (amount_col or debit_col or credit_col):
        raise ValueError(
            "Colonnes manquantes : il faut une date, un libellé et un montant "
            "(ou des colonnes Débit/Crédit)."
        )

    out = pd.DataFrame(index=df.index)

    # Date : JJ/MM/AAAA ou ISO -> datetime
    raw_date = df[date_col].str.strip()
    parsed = pd.to_datetime(raw_date, format="%d/%m/%Y", errors="coerce")
    parsed = parsed.fillna(pd.to_datetime(raw_date, format="%Y-%m-%d", errors="coerce"))
    out["date_dt"] = parsed

    # Libellé
    out["merchant"] = df[merchant_col].str.strip()

    # Montant : colonne unique signée OU colonnes Débit/Crédit séparées
    if amount_col:
        amount = _to_number(df[amount_col])
    else:
        amount = pd.Series(float("nan"), index=df.index, dtype="float64")
        if credit_col:
            amount = amount.fillna(_to_number(df[credit_col]).abs())   # crédit -> +
        if debit_col:
            amount = amount.fillna(-_to_number(df[debit_col]).abs())   # débit  -> -
    out["amount"] = amount

    out["category"] = df[category_col].str.strip() if category_col else "Non catégorisé"
    out["account"] = df[account_col].str.strip() if account_col else ""
    out["reference"] = (
        df[reference_col].str.strip().str.lower() if reference_col else ""
    )

    # Validation : on retire les lignes sans date / montant / libellé
    before = len(out)
    out = out.dropna(subset=["date_dt", "amount"])
    out = out[out["merchant"] != ""]
    skipped = before - len(out)

    if out.empty:
        return ParseResult(records=[], skipped=skipped, in_file_duplicates=0)

    out["date"] = out["date_dt"].dt.strftime("%Y-%m-%d")
    out["type"] = out["amount"].apply(lambda a: "debit" if a < 0 else "credit")

    # Virement interne : détecté via la catégorie/le libellé de la banque.
    transfer_text = (
        out["category"].astype(str) + " " + out["merchant"].astype(str)
    ).str.lower()
    out["is_transfer"] = transfer_text.str.contains(
        r"virement interne|transaction exclue|virement vers|virement de ",
        regex=True,
    )

    # Empreinte de base : date | montant | libellé | référence
    base = (
        out["date"] + "|"
        + (out["amount"] * 100).round().astype("int64").astype(str) + "|"
        + out["merchant"].str.lower() + "|"
        + out["reference"]
    )

    # Index d'occurrence : distingue 2 transactions identiques le même jour
    # (ex. 2 abonnements Ankama). 1re occurrence = 0, 2e = 1, etc.
    # → les doublons LÉGITIMES sont conservés, et un ré-import reproduit les
    #   mêmes index, donc reste dédoublonné par la contrainte unique en base.
    occurrence = base.groupby(base).cumcount()
    out["fingerprint"] = base + "|" + occurrence.astype(str)

    # Plus de dédup intra-fichier : l'index d'occurrence garde les vrais doublons.
    in_file_duplicates = 0

    records = [
        {
            "workspace_id": workspace_id,
            "account_id": account_id,
            "date": row.date,
            "label": row.merchant,
            "category": row.category,
            "category_source": "import",
            "category_confidence": None,
            "amount": float(row.amount),
            "direction": row.type,
            "status": "cleared",
            "is_transfer": bool(row.is_transfer),
            "fingerprint": row.fingerprint,
        }
        for row in out.itertuples(index=False)
    ]

    return ParseResult(
        records=records,
        skipped=skipped,
        in_file_duplicates=in_file_duplicates,
    )
