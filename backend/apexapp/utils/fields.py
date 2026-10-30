"""Look up values in loosely-specified rows (eMachine column names are not fixed by contract)."""

from __future__ import annotations

import re
from typing import Any

Row = dict[str, Any]

LABEL_FIELDS = (
    "Description", "description", "Name", "name", "ItemName", "Item", "item",
    "Material", "MaterialName", "Equipment", "EquipmentName", "Expense", "ExpenseName",
    "ExpenseType", "Type", "Title", "title",
)
_ID_KEY = re.compile(r"^id$|_id$|^id_", re.I)


def pick(row: Row | None, *names: str) -> Any:
    """First non-empty value among ``names``; exact match first, then case-insensitive."""
    if not row:
        return None
    for n in names:
        v = row.get(n)
        if v is not None and v != "":
            return v
    lower = {k.lower(): k for k in row}
    for n in names:
        k = lower.get(n.lower())
        if k is not None and row[k] is not None and row[k] != "":
            return row[k]
    return None


def text(row: Row | None, *names: str) -> str:
    v = pick(row, *names)
    return "" if v is None else str(v).strip()


def number(row: Row | None, *names: str) -> float:
    try:
        return float(pick(row, *names))
    except (TypeError, ValueError):
        return 0.0


def label_of(row: Row) -> str:
    if direct := text(row, *LABEL_FIELDS):
        return direct
    for k, v in row.items():
        if isinstance(v, str) and v.strip() and not _ID_KEY.search(k):
            return v.strip()
    return text(row, "Id", "id")


def id_of(row: Row) -> str:
    return text(row, "Id", "id", "ID") or label_of(row)


def truthy(v: Any) -> bool:
    return v is True or v == 1 or str(v).strip().lower() in ("1", "true", "yes", "y")


def iso_date(v: Any) -> str | None:
    s = "" if v is None else str(v).strip()
    return s[:10] if re.match(r"^\d{4}-\d{2}-\d{2}", s) else None
