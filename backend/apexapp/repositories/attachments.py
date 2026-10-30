from __future__ import annotations

from sqlalchemy import Connection, select

from .. import crud
from ..schema import tag_attachments


def list_for_tag(conn: Connection, tag_id: int) -> list[dict]:
    return crud.rows_where(conn, tag_attachments, tag_attachments.c.tag_id == tag_id, order_by=tag_attachments.c.id)


def get(conn: Connection, attachment_id: int) -> dict | None:
    return crud.get_by_id(conn, tag_attachments, attachment_id)


def insert(conn: Connection, values: dict) -> int:
    return crud.insert_row(conn, tag_attachments, values)


def delete(conn: Connection, attachment_id: int) -> int:
    return crud.delete_where(conn, tag_attachments, tag_attachments.c.id == attachment_id)


def all_storage_keys(conn: Connection) -> set[str]:
    return {r[0] for r in conn.execute(select(tag_attachments.c.storage_key))}
