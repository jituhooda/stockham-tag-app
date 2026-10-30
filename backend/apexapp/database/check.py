"""Database health and schema verification.

    python -m apexapp.database.check            # connect + migration status (exit 1 if pending)
    python -m apexapp.database.check --verify   # also compare tables/columns with data-model/model.json
    python -m apexapp.database.check --dump     # write database/schema/<dialect>/schema.sql
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

from sqlalchemy import inspect, text
from sqlalchemy.engine import make_url

from ..config import get_settings
from .connection import dialect_name, get_engine
from .migrate import applied_versions, discover

ROOT = Path(__file__).resolve().parents[3]


def redact(url: str) -> str:
    return make_url(url).render_as_string(hide_password=True)


def status() -> tuple[bool, list[str]]:
    s = get_settings()
    engine = get_engine()
    lines = [f"Database:  {redact(s.database_url)} ({dialect_name(engine)})"]
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:  # noqa: BLE001
        return False, lines + [f"Connect:   FAILED ({e.__class__.__name__}: {e})"]
    lines.append("Connect:   ok")
    done = applied_versions(engine)
    pending = [m.version for m in discover(s.migrations_dir, dialect_name(engine)) if m.version not in done]
    lines.append(f"Schema:    {max(done) if done else 'empty'}" + (f", pending: {', '.join(pending)}" if pending else ", up to date"))
    return not pending, lines


def verify() -> list[str]:
    model = json.loads((ROOT / "data-model" / "model.json").read_text())
    expected = {e["table"]: {f["name"] for f in e["fields"]} for e in model["entities"]}
    insp = inspect(get_engine())
    live = {t: {c["name"] for c in insp.get_columns(t)} for t in insp.get_table_names() if t != "schema_migrations"}
    problems = [f"missing table {t}" for t in expected.keys() - live.keys()]
    problems += [f"unexpected table {t}" for t in live.keys() - expected.keys()]
    for t in expected.keys() & live.keys():
        problems += [f"{t}: missing column {c}" for c in expected[t] - live[t]]
        problems += [f"{t}: unexpected column {c}" for c in live[t] - expected[t]]
    return problems


def dump() -> Path:
    engine = get_engine()
    dialect = dialect_name(engine)
    out = ROOT / "database" / "schema" / dialect / "schema.sql"
    header = f"-- {'SQLite' if dialect == 'sqlite' else 'PostgreSQL'} schema after all migrations (generated: scripts/db-verify.sh --dump)\n\n"
    if dialect == "sqlite":
        with engine.connect() as conn:
            rows = conn.execute(text(
                "SELECT sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' "
                "ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END, rowid")).scalars()
            body = ";\n\n".join(rows) + ";\n"
    else:
        if not shutil.which("pg_dump"):
            raise SystemExit("pg_dump is not installed")
        url = make_url(get_settings().database_url).set(drivername="postgresql")
        raw = subprocess.run(["pg_dump", "-s", "--no-owner", "--no-privileges", url.render_as_string(hide_password=False)],
                             check=True, capture_output=True, text=True).stdout
        keep = [l for l in raw.splitlines() if not l.startswith(("SET ", "SELECT pg_catalog", "-- Dumped", "\\restrict", "\\unrestrict")) and l != "--"]
        body = "\n".join(keep) + "\n"
    out.write_text(header + body, encoding="utf-8")
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--dump", action="store_true")
    args = parser.parse_args()
    ok, lines = status()
    print("\n".join(lines))
    if args.verify and ok:
        problems = verify()
        print("Model:     " + ("matches data-model/model.json" if not problems else "MISMATCH"))
        for p in problems:
            print(f"  - {p}")
        ok = not problems
    if args.dump and ok:
        print(f"Wrote {dump()}")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
