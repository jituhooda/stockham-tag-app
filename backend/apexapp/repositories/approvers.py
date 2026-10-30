from __future__ import annotations

from sqlalchemy import Connection, func, select

from .. import crud
from ..schema import approvers
from ..utils.time import utcnow


def list_for_customer(conn: Connection, customer: str) -> list[dict]:
    stmt = select(approvers).where(func.lower(approvers.c.customer) == customer.strip().lower()).order_by(approvers.c.name)
    return [dict(r) for r in conn.execute(stmt).mappings()]


def upsert(conn: Connection, customer: str, name: str, email: str = "") -> dict:
    existing = conn.execute(
        select(approvers).where(
            func.lower(approvers.c.customer) == customer.strip().lower(),
            func.lower(approvers.c.name) == name.strip().lower(),
        )
    ).mappings().first()
    if existing:
        if email and email != existing["email"]:
            crud.update_by_id(conn, approvers, existing["id"], {"email": email})
            return {**existing, "email": email}
        return dict(existing)
    new_id = crud.insert_row(conn, approvers, {"customer": customer.strip(), "name": name.strip(), "email": email, "created_at": utcnow()})
    return crud.get_by_id(conn, approvers, new_id)  # type: ignore[return-value]
