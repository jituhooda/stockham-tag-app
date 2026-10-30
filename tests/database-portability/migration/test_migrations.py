"""Rules from database/portability/compatibility-rules.json that can be checked statically."""

import json
import re
from pathlib import Path

import pytest

from apexapp.database.migrate import VERSION_RE, discover, split_statements

ROOT = Path(__file__).resolve().parents[3]
MIG = ROOT / "database" / "migrations"
RULES = {r["id"]: r for r in json.loads((ROOT / "database/portability/compatibility-rules.json").read_text())["rules"]}


def versions(sub):
    return {VERSION_RE.match(f.name).group(1) for f in (MIG / sub).glob("*.sql")}


def test_file_names_follow_convention():
    for f in MIG.rglob("*.sql"):
        assert VERSION_RE.match(f.name), f"{f.name} must be NNNN_name.sql"


def test_P002_dialect_files_come_in_pairs():
    assert RULES["P002"]["checked"]
    assert versions("sqlite") == versions("postgres")


@pytest.mark.parametrize("pattern", [r"\bRETURNING\b", r"\bON CONFLICT\b", r"AUTOINCREMENT", r"GENERATED .* IDENTITY",
                                     r"\bSERIAL\b", r"::", r"\bILIKE\b", r"COLLATE NOCASE", r"\bPRAGMA\b"])
def test_P003_common_migrations_are_portable(pattern):
    for f in (MIG / "common").glob("*.sql"):
        assert not re.search(pattern, f.read_text(), re.I), f"{f.name} uses non-portable {pattern}"


def test_versions_are_unique_per_folder():
    for sub in ("common", "sqlite", "postgres"):
        names = [VERSION_RE.match(f.name).group(1) for f in (MIG / sub).glob("*.sql")]
        assert len(names) == len(set(names)), sub


def test_common_runs_before_dialect_within_a_version():
    for m in discover(MIG, "postgres"):
        kinds = [f.parent.name for f in m.files]
        assert kinds == sorted(kinds, key=lambda k: k != "common")


def test_statement_splitter():
    sql = "-- comment\nCREATE TABLE a (x INT);\nINSERT INTO a VALUES (1);\n"
    assert split_statements(sql) == ["CREATE TABLE a (x INT)", "INSERT INTO a VALUES (1)"]


def test_P004_both_dialects_produce_the_same_shape(tmp_path, request):
    """Needs Postgres for the full comparison; without it, checks SQLite against schema.py."""
    import os

    from apexapp.database.connection import create_db_engine
    from apexapp.database.migrate import migrate
    from apexapp.utils.testing import reset_postgres

    spec = __import__("importlib.util").util.spec_from_file_location("shared", Path(__file__).parents[1] / "shared.py")
    shared = __import__("importlib.util").util.module_from_spec(spec)
    spec.loader.exec_module(shared)

    lite = create_db_engine(f"sqlite:///{tmp_path / 'a.db'}")
    migrate(lite, MIG)
    shapes = [shared.schema_shape(lite)]
    if url := os.environ.get("TEST_POSTGRES_URL"):
        reset_postgres(url)
        pg = create_db_engine(url)
        migrate(pg, MIG)
        shapes.append(shared.schema_shape(pg))
        pg.dispose()
    lite.dispose()
    assert all(s == shapes[0] for s in shapes)
