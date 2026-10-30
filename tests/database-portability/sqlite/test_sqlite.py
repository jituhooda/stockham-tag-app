import importlib.util
from pathlib import Path

import pytest

from apexapp.database.connection import create_db_engine

_spec = importlib.util.spec_from_file_location("shared", Path(__file__).parents[1] / "shared.py")
shared = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(shared)


@pytest.fixture
def engine(tmp_path):
    e = create_db_engine(f"sqlite:///{tmp_path / 'p.db'}")
    yield e
    e.dispose()


def test_migrates_cleanly(engine):
    shared.check_migrates_cleanly(engine, "sqlite")


def test_schema_matches_code_and_model(engine):
    shared.check_migrates_cleanly(engine, "sqlite")
    shared.check_matches_code_and_model(engine)


def test_constraints_enforced(engine):
    shared.check_migrates_cleanly(engine, "sqlite")
    shared.check_constraints(engine)


def test_decimal_roundtrip(engine):
    shared.check_migrates_cleanly(engine, "sqlite")
    shared.check_decimal_roundtrip(engine)


def test_wal_and_foreign_keys_pragmas(engine):
    from sqlalchemy import text
    with engine.connect() as conn:
        assert conn.execute(text("PRAGMA foreign_keys")).scalar() == 1
        assert conn.execute(text("PRAGMA journal_mode")).scalar() == "wal"
