from __future__ import annotations

from typing import Any

from sqlalchemy import Engine, create_engine

NAME = "postgres"


def matches(url: str) -> bool:
    return url.startswith("postgres")


def normalise(url: str) -> str:
    """Use the psycopg 3 driver whatever form the URL arrives in."""
    for prefix in ("postgresql+psycopg2://", "postgresql://", "postgres://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


def create(url: str, cfg: dict[str, Any]) -> Engine:
    opts = cfg.get("postgres", {})
    return create_engine(
        normalise(url),
        pool_size=int(opts.get("poolSize", 5)),
        max_overflow=int(opts.get("maxOverflow", 10)),
        pool_pre_ping=True,
    )
