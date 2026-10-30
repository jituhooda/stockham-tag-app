"""Checks run identically against every supported database."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from sqlalchemy import Engine, inspect, text
from sqlalchemy.exc import IntegrityError

from apexapp.crud import insert_row
from apexapp.database.migrate import applied_versions, discover, migrate
from apexapp.schema import metadata, tag_labor, tags
from apexapp.utils.time import utcnow

ROOT = Path(__file__).resolve().parents[2]
MIGRATIONS = ROOT / "database" / "migrations"
MODEL = json.loads((ROOT / "data-model" / "model.json").read_text())


def schema_shape(engine: Engine) -> dict[str, set[str]]:
    insp = inspect(engine)
    return {t: {c["name"] for c in insp.get_columns(t)} for t in insp.get_table_names() if t != "schema_migrations"}


def check_migrates_cleanly(engine: Engine, dialect: str) -> None:
    ran = migrate(engine, MIGRATIONS)
    assert ran == [m.version for m in discover(MIGRATIONS, dialect)]
    assert migrate(engine, MIGRATIONS) == [], "second run is a no-op"
    assert set(applied_versions(engine)) == set(ran)


def check_matches_code_and_model(engine: Engine) -> None:
    live = schema_shape(engine)
    code = {t.name: {c.name for c in t.columns} for t in metadata.sorted_tables}
    model = {e["table"]: {f["name"] for f in e["fields"]} for e in MODEL["entities"]}
    assert live == code, "migrations and apexapp/schema.py disagree"
    assert live == model, "migrations and data-model/model.json disagree"


def _tag(conn) -> int:
    return insert_row(conn, tags, {"tag_number": "P-1", "created_at": utcnow(), "updated_at": utcnow()})


def check_constraints(engine: Engine) -> None:
    with engine.begin() as conn:
        tid = _tag(conn)
        insert_row(conn, tag_labor, {"tag_id": tid, "employee_name": "A", "regular_hours": 1.25})
    # Cascade delete
    with engine.begin() as conn:
        conn.execute(tags.delete().where(tags.c.id == tid))
        assert conn.execute(text("SELECT COUNT(*) FROM tag_labor")).scalar() == 0
    # Foreign key to tag_statuses
    with pytest.raises(IntegrityError), engine.begin() as conn:
        insert_row(conn, tags, {"tag_number": "X", "status": "Bogus", "created_at": utcnow(), "updated_at": utcnow()})
    # CHECK constraint
    with pytest.raises(IntegrityError), engine.begin() as conn:
        insert_row(conn, tag_labor, {"tag_id": _tag(conn), "regular_hours": -1})
    # Unique external id
    with pytest.raises(IntegrityError), engine.begin() as conn:
        for _ in range(2):
            insert_row(conn, tags, {"tag_number": "E", "external_id": 77, "created_at": utcnow(), "updated_at": utcnow()})


def check_decimal_roundtrip(engine: Engine) -> None:
    with engine.begin() as conn:
        tid = _tag(conn)
        insert_row(conn, tag_labor, {"tag_id": tid, "regular_hours": 7.25, "overtime_hours": 0.5})
        row = conn.execute(tag_labor.select().where(tag_labor.c.tag_id == tid)).mappings().one()
    assert float(row["regular_hours"]) == 7.25 and float(row["overtime_hours"]) == 0.5
