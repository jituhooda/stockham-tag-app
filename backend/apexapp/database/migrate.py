"""Plain-SQL migration runner.

Migrations live in ``database/migrations/{common,sqlite,postgres}`` as
``NNNN_name.sql``. For each version, the common file runs first, then the file
for the current dialect. Applied versions are recorded in ``schema_migrations``.

Run: ``python -m apexapp.database.migrate [--status]``
"""

from __future__ import annotations

import argparse
import hashlib
import logging
import re
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import Engine, text

from ..config import get_settings
from .connection import dialect_name, get_engine

log = logging.getLogger(__name__)
VERSION_RE = re.compile(r"^(\d{4})_[\w-]+\.sql$")


@dataclass
class Migration:
    version: str
    files: list[Path]

    @property
    def checksum(self) -> str:
        h = hashlib.sha256()
        for f in self.files:
            h.update(f.read_bytes())
        return h.hexdigest()


def discover(migrations_dir: Path, dialect: str) -> list[Migration]:
    by_version: dict[str, list[Path]] = {}
    for sub in ("common", dialect):
        d = migrations_dir / sub
        if not d.is_dir():
            continue
        for f in sorted(d.iterdir()):
            m = VERSION_RE.match(f.name)
            if m:
                by_version.setdefault(m.group(1), []).append(f)
    return [Migration(v, files) for v, files in sorted(by_version.items())]


def split_statements(sql: str) -> list[str]:
    """Split on semicolons at line ends; our migrations contain no procedural bodies."""
    body = "\n".join(line for line in sql.splitlines() if not line.strip().startswith("--"))
    return [s.strip() for s in re.split(r";\s*(?:\n|$)", body) if s.strip()]


def _ensure_table(engine: Engine) -> None:
    with engine.begin() as conn:
        conn.execute(text(
            "CREATE TABLE IF NOT EXISTS schema_migrations ("
            " version VARCHAR(20) PRIMARY KEY,"
            " checksum VARCHAR(64) NOT NULL,"
            " applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)"
        ))


def applied_versions(engine: Engine) -> dict[str, str]:
    _ensure_table(engine)
    with engine.connect() as conn:
        return {r.version: r.checksum for r in conn.execute(text("SELECT version, checksum FROM schema_migrations"))}


def migrate(engine: Engine | None = None, migrations_dir: Path | None = None) -> list[str]:
    engine = engine or get_engine()
    migrations_dir = migrations_dir or get_settings().migrations_dir
    dialect = dialect_name(engine)
    done = applied_versions(engine)
    ran: list[str] = []
    for m in discover(migrations_dir, dialect):
        if m.version in done:
            if done[m.version] != m.checksum:
                log.warning("Migration %s changed after it was applied", m.version)
            continue
        with engine.begin() as conn:
            for f in m.files:
                for stmt in split_statements(f.read_text(encoding="utf-8")):
                    conn.execute(text(stmt))
            conn.execute(
                text("INSERT INTO schema_migrations (version, checksum) VALUES (:v, :c)"),
                {"v": m.version, "c": m.checksum},
            )
        log.info("Applied migration %s (%s)", m.version, ", ".join(f.name for f in m.files))
        ran.append(m.version)
    return ran


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--status", action="store_true", help="list migrations and whether they are applied")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    engine = get_engine()
    if args.status:
        done = applied_versions(engine)
        for m in discover(get_settings().migrations_dir, dialect_name(engine)):
            print(f"{m.version}  {'applied' if m.version in done else 'pending'}  {', '.join(f.name for f in m.files)}")
        return
    ran = migrate(engine)
    print(f"Applied {len(ran)} migration(s)" + (f": {', '.join(ran)}" if ran else ""))


if __name__ == "__main__":
    main()
