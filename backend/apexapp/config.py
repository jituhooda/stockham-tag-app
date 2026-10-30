"""Application settings.

Settings come from the JSON files in the project's ``config/`` directory and
are then overridden by environment variables, so the same image runs in every
environment. Relative paths in the JSON files resolve against ``config/``.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

DEFAULT_CONFIG_DIR = Path(__file__).resolve().parents[2] / "config"


def _load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    data.pop("$schema", None)
    return data


def _resolve(base: Path, value: str) -> Path:
    p = Path(value)
    return p if p.is_absolute() else (base / p).resolve()


def _path(env_name: str, config_dir: Path, configured: str) -> Path:
    """Environment paths are relative to the working directory; JSON paths to config/."""
    if value := os.environ.get(env_name):
        return Path(value).resolve()
    return _resolve(config_dir, configured)


def _env_list(name: str) -> list[str] | None:
    raw = os.environ.get(name)
    if raw is None:
        return None
    return [v.strip() for v in raw.split(",") if v.strip()]


@dataclass(frozen=True)
class User:
    name: str
    role: str


@dataclass
class Settings:
    env: str
    config_dir: Path
    app: dict[str, Any]
    branding: dict[str, Any]
    features: dict[str, Any]
    database_url: str
    database: dict[str, Any]
    migrations_dir: Path
    run_migrations: bool
    emachine_mode: str
    emachine_url: str
    emachine_token: str
    emachine_timeout: float
    emachine_cache_ttl: int
    emachine_queries: dict[str, str]
    fixtures_dir: Path
    auth_mode: str
    default_role: str
    auth_tokens: dict[str, User]
    cors_origins: list[str]
    upload_max_bytes: int
    upload_allowed_types: list[str]
    attachments_dir: Path
    max_signature_bytes: int
    log_level: str
    log_format: str
    access_log: bool
    extra: dict[str, Any] = field(default_factory=dict)

    @property
    def version(self) -> str:
        return str(self.app.get("version", "0.0.0"))

    def public(self) -> dict[str, Any]:
        """Settings that are safe to hand to the browser."""
        return {
            "app": {k: self.app.get(k) for k in ("name", "shortName", "subtitle", "version", "defaultDivisions", "editableStatuses")},
            "branding": self.branding,
            "features": {k: v for k, v in self.features.items() if k != "issuesQuery"}
            | {"issuesConfigured": bool(self.features.get("issuesQuery"))},
            "auth": {"mode": self.auth_mode},
            "uploads": {"maxBytes": self.upload_max_bytes, "allowedTypes": self.upload_allowed_types},
        }


def _database_url(db: dict[str, Any], config_dir: Path) -> str:
    if url := os.environ.get("DATABASE_URL"):
        return url
    if db.get("dialect", "sqlite") == "postgres":
        pg = db.get("postgres", {})
        password = os.environ.get("POSTGRES_PASSWORD", "")
        auth = f"{pg.get('user', 'postgres')}:{password}@" if password else f"{pg.get('user', 'postgres')}@"
        return f"postgresql+psycopg://{auth}{pg.get('host', 'localhost')}:{pg.get('port', 5432)}/{pg.get('database', 'stockham_tags')}"
    path = _resolve(config_dir, db.get("sqlite", {}).get("path", "../data/stockham-tags.db"))
    return f"sqlite:///{path}"


def _auth_tokens() -> dict[str, User]:
    raw = os.environ.get("AUTH_TOKENS", "").strip()
    if not raw:
        return {}
    data = json.loads(raw)
    return {token: User(name=v.get("name", "user"), role=v.get("role", "viewer")) for token, v in data.items()}


def load_settings(config_dir: Path | None = None) -> Settings:
    cfg_dir = Path(os.environ.get("CONFIG_DIR", config_dir or DEFAULT_CONFIG_DIR)).resolve()
    app = _load_json(cfg_dir / "app.config.json")
    db = _load_json(cfg_dir / "database.config.json")
    branding = _load_json(cfg_dir / "branding.config.json")
    features = _load_json(cfg_dir / "features.config.json")
    emachine = _load_json(cfg_dir / "integrations.config.json").get("emachine", {})
    security = _load_json(cfg_dir / "security.config.json")
    logging_cfg = _load_json(cfg_dir / "logging.config.json")
    uploads = security.get("uploads", {})
    env = os.environ

    if q := env.get("ISSUES_QUERY"):
        features["issuesQuery"] = q

    return Settings(
        env=env.get("APP_ENV", "development"),
        config_dir=cfg_dir,
        app=app,
        branding=branding,
        features=features,
        database_url=_database_url(db, cfg_dir),
        database=db,
        migrations_dir=_path("MIGRATIONS_DIR", cfg_dir, db.get("migrationsDir", "../database/migrations")),
        run_migrations=env.get("RUN_MIGRATIONS", str(db.get("runMigrationsOnStartup", True))).lower() in ("1", "true", "yes"),
        emachine_mode=env.get("EMACHINE_MODE", emachine.get("mode", "live")),
        emachine_url=env.get("EMACHINE_BASE_URL", emachine.get("baseUrl", "")),
        emachine_token=env.get("EMACHINE_API_TOKEN", ""),
        emachine_timeout=float(emachine.get("timeoutSeconds", 20)),
        emachine_cache_ttl=int(env.get("EMACHINE_CACHE_TTL", emachine.get("cacheTtlSeconds", 300))),
        emachine_queries=emachine.get("queries", {}),
        fixtures_dir=_path("FIXTURES_DIR", cfg_dir, emachine.get("fixturesDir", "../database/fixtures/emachine")),
        auth_mode=env.get("AUTH_MODE", security.get("authMode", "none")),
        default_role=security.get("defaultRole", "admin"),
        auth_tokens=_auth_tokens(),
        cors_origins=_env_list("CORS_ORIGINS") or security.get("corsOrigins", []),
        upload_max_bytes=int(uploads.get("maxBytes", 10 * 1024 * 1024)),
        upload_allowed_types=list(uploads.get("allowedTypes", [])),
        attachments_dir=_path("ATTACHMENTS_DIR", cfg_dir, uploads.get("dir", "../data/attachments")),
        max_signature_bytes=int(security.get("maxSignatureBytes", 512 * 1024)),
        log_level=env.get("LOG_LEVEL", logging_cfg.get("level", "INFO")).upper(),
        log_format=env.get("LOG_FORMAT", logging_cfg.get("format", "text")),
        access_log=bool(logging_cfg.get("accessLog", True)),
    )


@lru_cache
def get_settings() -> Settings:
    return load_settings()
