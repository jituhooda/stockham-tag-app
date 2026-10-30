#!/usr/bin/env bash
# Apply pending migrations.   --status  list them   --seed  also load database/seeds/dev-sample.sql
source "$(dirname "$0")/_common.sh"

case "${1:-}" in
  --status) backend_py -m apexapp.database.migrate --status ;;
  --seed)
    backend_py -m apexapp.database.migrate
    backend_py - <<'PY'
from pathlib import Path
from sqlalchemy import text
from apexapp.database.connection import get_engine
from apexapp.database.migrate import split_statements
sql = (Path("..") / "database/seeds/dev-sample.sql").read_text()
with get_engine().begin() as conn:
    for stmt in split_statements(sql):
        try:
            conn.execute(text(stmt))
        except Exception as e:  # already seeded
            print(f"skipped: {e.__class__.__name__}")
print("Seed data loaded")
PY
    ;;
  "") backend_py -m apexapp.database.migrate ;;
  *) die "Unknown option $1" ;;
esac
