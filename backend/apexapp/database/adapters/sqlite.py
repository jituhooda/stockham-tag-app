from __future__ import annotations

from pathlib import Path
from typing import Any

from sqlalchemy import Engine, create_engine, event

NAME = "sqlite"


def matches(url: str) -> bool:
    return url.startswith("sqlite")


def create(url: str, cfg: dict[str, Any]) -> Engine:
    opts = cfg.get("sqlite", {})
    db_path = url.split("///", 1)[-1]
    if db_path and db_path != ":memory:":
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)

    engine = create_engine(url, connect_args={"check_same_thread": False})
    journal = opts.get("journalMode", "WAL")
    busy = int(opts.get("busyTimeoutMs", 5000))

    @event.listens_for(engine, "connect")
    def _on_connect(dbapi_conn, _record):  # pragma: no cover - exercised implicitly
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA foreign_keys = ON")
        cur.execute(f"PRAGMA busy_timeout = {busy}")
        if db_path != ":memory:":
            cur.execute(f"PRAGMA journal_mode = {journal}")
        cur.close()

    return engine
