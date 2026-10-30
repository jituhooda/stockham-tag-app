"""Helpers for running the app against a throwaway database (used by both test suites)."""

from __future__ import annotations

import base64
import os
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from fastapi.testclient import TestClient

# 1x1 transparent PNG, a valid in-person signature for tests.
TINY_PNG = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
)
TINY_PNG_BYTES = base64.b64decode(TINY_PNG.split(",", 1)[1])


def reset_caches() -> None:
    from ..config import get_settings
    from ..database.connection import get_engine
    from ..integrations.emachine import set_emachine

    if get_engine.cache_info().currsize:
        get_engine().dispose()
    get_settings.cache_clear()
    get_engine.cache_clear()
    set_emachine(None)


def reset_postgres(url: str) -> None:
    """Drop everything in the public schema so each test starts from an empty database."""
    from sqlalchemy import text

    from ..database.connection import create_db_engine

    engine = create_db_engine(url)
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
    engine.dispose()


@contextmanager
def app_client(tmp_path: Path, database_url: str | None = None, **env: str) -> Iterator[TestClient]:
    """A TestClient for a fresh app: fixtures mode, temp attachments dir, migrated database.

    Uses SQLite in ``tmp_path`` unless ``database_url`` (or ``TEST_DATABASE_URL``) names Postgres.
    """
    database_url = database_url or os.environ.get("TEST_DATABASE_URL")
    if database_url and database_url.startswith("postgres"):
        reset_postgres(database_url)
    values = {
        "APP_ENV": "test",
        "DATABASE_URL": database_url or f"sqlite:///{tmp_path / 'test.db'}",
        "EMACHINE_MODE": "fixtures",
        "EMACHINE_CACHE_TTL": "0",
        "ATTACHMENTS_DIR": str(tmp_path / "attachments"),
        "AUTH_MODE": "none",
        "RUN_MIGRATIONS": "true",
        "WARM_CACHE": "0",
        "LOG_LEVEL": "WARNING",
        **env,
    }
    saved = {k: os.environ.get(k) for k in values}
    os.environ.update(values)
    reset_caches()
    try:
        from ..main import create_app

        with TestClient(create_app()) as client:
            yield client
    finally:
        reset_caches()
        for k, v in saved.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v


def sample_tag(**overrides) -> dict:
    body = {
        "tagNumber": "T-1",
        "description": "Add door frame",
        "tagDate": "2026-05-29",
        "jobNo": "25033",
        "jobName": "Dragoneer 1 Letterman",
        "customerName": "Principal Builders",
        "labor": [{"employeeId": "101", "employeeName": "Jacob S Adams", "trade": "Framing", "regular": 7, "overtime": 4, "doubleTime": 0}],
        "materials": [{"description": "wood door", "qty": 2, "length": 3}],
        "equipment": [{"description": "Scissor Lift", "qty": 3}],
        "expenses": [{"description": "Parking", "amount": 35}],
        "issues": ["2 : 3133 is called out as HMF"],
    }
    body.update(overrides)
    return body
