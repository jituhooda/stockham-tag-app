from __future__ import annotations

from collections.abc import Iterator

from sqlalchemy import Connection

from .connection import get_engine


def get_connection() -> Iterator[Connection]:
    """FastAPI dependency: one transaction per request, committed on success."""
    with get_engine().begin() as conn:
        yield conn
