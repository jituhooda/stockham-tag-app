"""Small, dialect-neutral helpers over SQLAlchemy Core used by the repositories."""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from typing import Any

from sqlalchemy import Connection, Table, delete, insert, select, update


def insert_row(conn: Connection, table: Table, values: Mapping[str, Any]) -> int:
    """Insert one row and return its primary key (works on SQLite and Postgres)."""
    pk = list(table.primary_key.columns)[0]
    res = conn.execute(insert(table).values(**values).returning(pk))
    return int(res.scalar_one())


def insert_many(conn: Connection, table: Table, rows: Iterable[Mapping[str, Any]]) -> None:
    rows = list(rows)
    if rows:
        conn.execute(insert(table), rows)


def get_by_id(conn: Connection, table: Table, row_id: Any) -> dict | None:
    pk = list(table.primary_key.columns)[0]
    row = conn.execute(select(table).where(pk == row_id)).mappings().first()
    return dict(row) if row else None


def update_by_id(conn: Connection, table: Table, row_id: Any, values: Mapping[str, Any]) -> int:
    pk = list(table.primary_key.columns)[0]
    return conn.execute(update(table).where(pk == row_id).values(**values)).rowcount


def delete_where(conn: Connection, table: Table, *conditions: Any) -> int:
    return conn.execute(delete(table).where(*conditions)).rowcount


def rows_where(conn: Connection, table: Table, *conditions: Any, order_by: Any = None) -> list[dict]:
    stmt = select(table).where(*conditions)
    if order_by is not None:
        stmt = stmt.order_by(order_by)
    return [dict(r) for r in conn.execute(stmt).mappings()]
