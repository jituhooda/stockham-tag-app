"""Copy all app data from one database to another (e.g. SQLite -> PostgreSQL).

The target is migrated first and must contain no tags. Rows are copied table by
table in foreign-key order inside one transaction; identity sequences are then
moved past the copied ids on PostgreSQL.

Run: ``python -m apexapp.database.transfer --from sqlite:///old.db --to postgresql+psycopg://…``
"""

from __future__ import annotations

import argparse
import logging

from sqlalchemy import Engine, func, select, text

from ..config import get_settings
from ..schema import metadata, tag_statuses, tags
from .connection import create_db_engine, dialect_name
from .migrate import migrate

log = logging.getLogger(__name__)
BATCH = 500


def transfer(source: Engine, target: Engine) -> dict[str, int]:
    migrate(source, get_settings().migrations_dir)
    migrate(target, get_settings().migrations_dir)
    with target.connect() as conn:
        if conn.execute(select(func.count()).select_from(tags)).scalar():
            raise RuntimeError("The target database already has tags; refusing to overwrite them")

    counts: dict[str, int] = {}
    with source.connect() as src, target.begin() as dst:
        for table in metadata.sorted_tables:
            if table is tag_statuses:  # reference data, created by migrations on both sides
                continue
            n = 0
            result = src.execution_options(stream_results=True).execute(select(table))
            while batch := result.mappings().fetchmany(BATCH):
                dst.execute(table.insert(), [dict(r) for r in batch])
                n += len(batch)
            counts[table.name] = n

        if dialect_name(target) == "postgres":
            for table in metadata.sorted_tables:
                if "id" in table.c and table.c.id.primary_key:
                    dst.execute(text(
                        f"SELECT setval(pg_get_serial_sequence('{table.name}', 'id'), "
                        f"COALESCE((SELECT MAX(id) FROM {table.name}), 0) + 1, false)"
                    ))
    return counts


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--from", dest="source", default=None, help="source DATABASE_URL (default: current)")
    parser.add_argument("--to", dest="target", required=True, help="target DATABASE_URL")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    s = get_settings()
    counts = transfer(create_db_engine(args.source or s.database_url, s.database), create_db_engine(args.target, s.database))
    for name, n in counts.items():
        print(f"{name:20} {n:>8} rows")


if __name__ == "__main__":
    main()
