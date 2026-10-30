from __future__ import annotations

from functools import lru_cache

from sqlalchemy import Engine

from ..config import get_settings
from .adapters import adapter_for


def create_db_engine(url: str, db_config: dict | None = None) -> Engine:
    return adapter_for(url).create(url, db_config or {})


def dialect_name(engine: Engine) -> str:
    return "postgres" if engine.dialect.name == "postgresql" else engine.dialect.name


@lru_cache
def get_engine() -> Engine:
    s = get_settings()
    return create_db_engine(s.database_url, s.database)
