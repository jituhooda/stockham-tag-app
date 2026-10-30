from __future__ import annotations

from decimal import Decimal
from typing import Any

from sqlalchemy import Connection, func, select

from .. import crud
from ..schema import LINE_TABLES, tag_expenses, tag_equipment, tag_issues, tag_labor, tag_materials, tag_signatures, tags


def _f(v: Any) -> float:
    return float(v) if isinstance(v, (Decimal, int, float)) else 0.0


def list_tags(conn: Connection) -> list[dict]:
    def count(t):
        return select(func.count()).select_from(t).where(t.c.tag_id == tags.c.id).scalar_subquery()

    stmt = select(
        tags,
        count(tag_labor).label("labor_count"),
        count(tag_materials).label("material_count"),
        count(tag_equipment).label("equipment_count"),
        count(tag_expenses).label("expense_count"),
    ).order_by(tags.c.updated_at.desc(), tags.c.id.desc())
    return [dict(r) for r in conn.execute(stmt).mappings()]


def get_tag(conn: Connection, tag_id: int) -> dict | None:
    return crud.get_by_id(conn, tags, tag_id)


def find_by_external_id(conn: Connection, external_id: int) -> dict | None:
    row = conn.execute(select(tags).where(tags.c.external_id == external_id)).mappings().first()
    return dict(row) if row else None


def external_ids(conn: Connection) -> set[int]:
    return {r[0] for r in conn.execute(select(tags.c.external_id).where(tags.c.external_id.is_not(None)))}


def insert_tag(conn: Connection, values: dict) -> int:
    return crud.insert_row(conn, tags, values)


def update_tag(conn: Connection, tag_id: int, values: dict) -> None:
    crud.update_by_id(conn, tags, tag_id, values)


def delete_tag(conn: Connection, tag_id: int) -> int:
    return crud.delete_where(conn, tags, tags.c.id == tag_id)


# -- lines -------------------------------------------------------------------

def load_lines(conn: Connection, tag_id: int) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {}
    for key, table in LINE_TABLES.items():
        out[key] = crud.rows_where(conn, table, table.c.tag_id == tag_id, order_by=table.c.position)
    return {
        "labor": [
            {"employeeId": r["employee_id"], "employeeName": r["employee_name"], "trade": r["trade"],
             "regular": _f(r["regular_hours"]), "overtime": _f(r["overtime_hours"]), "doubleTime": _f(r["double_hours"])}
            for r in out["labor"]
        ],
        "materials": [
            {"description": r["description"], "qty": _f(r["qty"]), "length": None if r["length"] is None else _f(r["length"])}
            for r in out["materials"]
        ],
        "equipment": [{"description": r["description"], "qty": _f(r["qty"])} for r in out["equipment"]],
        "expenses": [{"description": r["description"], "amount": _f(r["amount"])} for r in out["expenses"]],
    }


def replace_lines(conn: Connection, tag_id: int, lines: dict[str, list[dict]]) -> None:
    for table in LINE_TABLES.values():
        crud.delete_where(conn, table, table.c.tag_id == tag_id)
    crud.insert_many(conn, tag_labor, (
        {"tag_id": tag_id, "position": i, "employee_id": l["employeeId"], "employee_name": l["employeeName"],
         "trade": l["trade"], "regular_hours": l["regular"], "overtime_hours": l["overtime"], "double_hours": l["doubleTime"]}
        for i, l in enumerate(lines.get("labor", []))
    ))
    crud.insert_many(conn, tag_materials, (
        {"tag_id": tag_id, "position": i, "description": l["description"], "qty": l["qty"], "length": l.get("length")}
        for i, l in enumerate(lines.get("materials", []))
    ))
    crud.insert_many(conn, tag_equipment, (
        {"tag_id": tag_id, "position": i, "description": l["description"], "qty": l["qty"]}
        for i, l in enumerate(lines.get("equipment", []))
    ))
    crud.insert_many(conn, tag_expenses, (
        {"tag_id": tag_id, "position": i, "description": l["description"], "amount": l["amount"]}
        for i, l in enumerate(lines.get("expenses", []))
    ))


# -- issues & signature -------------------------------------------------------

def load_issues(conn: Connection, tag_id: int) -> list[str]:
    return [r["text"] for r in crud.rows_where(conn, tag_issues, tag_issues.c.tag_id == tag_id, order_by=tag_issues.c.position)]


def replace_issues(conn: Connection, tag_id: int, issues: list[str]) -> None:
    crud.delete_where(conn, tag_issues, tag_issues.c.tag_id == tag_id)
    crud.insert_many(conn, tag_issues, ({"tag_id": tag_id, "position": i, "text": t} for i, t in enumerate(issues)))


def load_signature(conn: Connection, tag_id: int) -> dict | None:
    return crud.get_by_id(conn, tag_signatures, tag_id)


def save_signature(conn: Connection, tag_id: int, values: dict) -> None:
    crud.delete_where(conn, tag_signatures, tag_signatures.c.tag_id == tag_id)
    crud.insert_many(conn, tag_signatures, [{"tag_id": tag_id, **values}])
