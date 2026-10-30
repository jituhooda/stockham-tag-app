"""FastAPI application factory.

Run locally: ``uv run uvicorn apexapp.main:app --reload``
"""

from __future__ import annotations

import logging
import os
import threading
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import __version__
from .api.routes import api_router, health
from .config import Settings, get_settings
from .database.migrate import migrate
from .jobs.warm_cache import warm_master_data
from .middleware.metrics import MetricsMiddleware, render_metrics
from .middleware.request_id import RequestIdMiddleware, current_request_id
from .middleware.security_headers import SecurityHeadersMiddleware
from .services.errors import ServiceError
from .utils.logging import configure_logging

log = logging.getLogger("apexapp")


def _problem(status: int, detail: str, problems: list[str] | None = None) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"detail": detail, "problems": problems or [], "requestId": current_request_id()},
    )


def create_app(settings: Settings | None = None) -> FastAPI:
    s = settings or get_settings()
    configure_logging(s.log_level, s.log_format)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        log.info("Starting %s %s (%s)", s.app.get("name", "app"), __version__, s.env)
        if s.run_migrations:
            migrate()
        if s.emachine_mode == "live" and not s.emachine_token:
            log.warning("EMACHINE_API_TOKEN is not set; eMachine requests will be unauthenticated")
        if os.environ.get("WARM_CACHE", "1") == "1":
            threading.Thread(target=warm_master_data, daemon=True, name="warm-cache").start()
        yield

    app = FastAPI(
        title="Stockham Tags API",
        version=__version__,
        description="Change-order tags for Stockham Construction. Reference data is read from eMachine; "
                    "tags, cost lines, attachments and signatures are stored in this service's database.",
        lifespan=lifespan,
        docs_url="/api/docs",
        redoc_url=None,
        openapi_url="/api/openapi.json",
    )

    # Middleware runs bottom-up: request id is outermost so every log line has it.
    app.add_middleware(MetricsMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)
    if s.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=s.cors_origins,
            allow_methods=["GET", "POST", "PUT", "DELETE"],
            allow_headers=["Authorization", "Content-Type", "X-Request-ID", "X-User-Name"],
            expose_headers=["X-Request-ID"],
        )
    app.add_middleware(RequestIdMiddleware)

    @app.exception_handler(ServiceError)
    async def _service_error(_: Request, exc: ServiceError):
        return _problem(exc.status_code, exc.detail, exc.problems)

    @app.exception_handler(HTTPException)
    async def _http_error(_: Request, exc: HTTPException):
        resp = _problem(exc.status_code, str(exc.detail))
        for k, v in (exc.headers or {}).items():
            resp.headers[k] = v
        return resp

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError):
        problems = [f"{'.'.join(str(p) for p in e['loc'][1:]) or 'body'}: {e['msg']}" for e in exc.errors()]
        return _problem(422, "The request is invalid", problems)

    @app.exception_handler(Exception)
    async def _unhandled(_: Request, exc: Exception):
        log.exception("Unhandled error: %s", exc)
        return _problem(500, "Something went wrong on the server")

    app.include_router(health.router)
    app.include_router(api_router)
    app.add_api_route("/metrics", render_metrics, include_in_schema=False)

    # Optional single-container mode: serve the built frontend from STATIC_DIR.
    static_dir = os.environ.get("STATIC_DIR")
    if static_dir and Path(static_dir, "index.html").exists():
        root = Path(static_dir)
        app.mount("/assets", StaticFiles(directory=root / "assets"), name="assets")

        @app.get("/{path:path}", include_in_schema=False)
        def spa(path: str):
            candidate = (root / path).resolve()
            if path and candidate.is_file() and root.resolve() in candidate.parents:
                return FileResponse(candidate)
            return FileResponse(root / "index.html")

    return app


app = create_app()
