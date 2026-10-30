from __future__ import annotations

from fastapi import APIRouter, Response
from sqlalchemy import text

from ... import __version__
from ...config import get_settings
from ...database.connection import dialect_name, get_engine

router = APIRouter(tags=["health"])


@router.get("/health/live", summary="Liveness probe")
def live() -> dict:
    return {"status": "ok"}


@router.get("/health/ready", summary="Readiness probe (database reachable)")
def ready(response: Response) -> dict:
    engine = get_engine()
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            version = conn.execute(text("SELECT MAX(version) FROM schema_migrations")).scalar()
        db = {"status": "ok", "dialect": dialect_name(engine), "schemaVersion": version}
    except Exception as e:  # noqa: BLE001 - report any failure as not ready
        response.status_code = 503
        db = {"status": "error", "error": e.__class__.__name__}
    s = get_settings()
    return {
        "status": "ok" if db["status"] == "ok" else "degraded",
        "version": __version__,
        "environment": s.env,
        "database": db,
        "emachine": {"mode": s.emachine_mode, "tokenConfigured": bool(s.emachine_token)},
    }
