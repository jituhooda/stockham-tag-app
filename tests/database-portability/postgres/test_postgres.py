import importlib.util
from pathlib import Path

import pytest

from apexapp.database.connection import create_db_engine
from apexapp.utils.testing import reset_postgres

_spec = importlib.util.spec_from_file_location("shared", Path(__file__).parents[1] / "shared.py")
shared = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(shared)


@pytest.fixture
def engine(postgres_url):
    reset_postgres(postgres_url)
    e = create_db_engine(postgres_url)
    yield e
    e.dispose()


def test_migrates_cleanly(engine):
    shared.check_migrates_cleanly(engine, "postgres")


def test_schema_matches_code_and_model(engine):
    shared.check_migrates_cleanly(engine, "postgres")
    shared.check_matches_code_and_model(engine)


def test_constraints_enforced(engine):
    shared.check_migrates_cleanly(engine, "postgres")
    shared.check_constraints(engine)


def test_decimal_roundtrip(engine):
    shared.check_migrates_cleanly(engine, "postgres")
    shared.check_decimal_roundtrip(engine)


def test_timestamps_are_timezone_aware(engine):
    shared.check_migrates_cleanly(engine, "postgres")
    from sqlalchemy import inspect
    cols = {c["name"]: c["type"] for c in inspect(engine).get_columns("tags")}
    assert getattr(cols["created_at"], "timezone", False)


def test_identity_ids_are_bigint(engine):
    shared.check_migrates_cleanly(engine, "postgres")
    from sqlalchemy import BigInteger, inspect
    cols = {c["name"]: c["type"] for c in inspect(engine).get_columns("tags")}
    assert isinstance(cols["id"], BigInteger)
