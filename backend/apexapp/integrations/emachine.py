"""Client for the eMachine data-model query API.

Every request is ``GET <baseUrl>?query=<base64(SQL)>`` with a bearer token.
In ``fixtures`` mode the client answers from JSON files instead (offline
development and tests); fixtures are keyed by query name, never by SQL.
"""

from __future__ import annotations

import base64
import json
import logging
import threading
import time
from pathlib import Path
from typing import Any

import httpx

from ..config import Settings, get_settings

log = logging.getLogger(__name__)
Row = dict[str, Any]


class EmachineError(RuntimeError):
    pass


def encode_query(sql: str) -> str:
    return base64.b64encode(sql.encode("utf-8")).decode("ascii")


def sql_literal(value: str) -> str:
    """Quote a value for a single-quoted SQL string (MySQL-compatible escaping)."""
    return "'" + value.replace("\\", "\\\\").replace("'", "''") + "'"


def extract_rows(body: Any) -> list[Row]:
    """The API may return a bare array or wrap it in an envelope."""
    if isinstance(body, list):
        return [r for r in body if isinstance(r, dict)]
    if isinstance(body, dict):
        for key in ("data", "rows", "result", "results", "records", "items"):
            v = body.get(key)
            if isinstance(v, list):
                return [r for r in v if isinstance(r, dict)]
            if isinstance(v, dict):
                nested = extract_rows(v)
                if nested:
                    return nested
    return []


class EmachineClient:
    def __init__(self, settings: Settings, transport: httpx.BaseTransport | None = None):
        self.s = settings
        self._cache: dict[str, tuple[float, list[Row]]] = {}
        self._lock = threading.Lock()
        self._http = httpx.Client(timeout=settings.emachine_timeout, transport=transport)

    # -- query building -------------------------------------------------
    def sql(self, name: str, **params: str) -> str:
        template = self.s.emachine_queries.get(name)
        if not template:
            raise EmachineError(f"No query configured for '{name}'")
        return template.format(**params)

    # -- execution ------------------------------------------------------
    def run(self, name: str, *, cache: bool = True, **params: str) -> list[Row]:
        sql = self.sql(name, **params)
        key = f"{name}:{sql}"
        ttl = self.s.emachine_cache_ttl
        if cache and ttl > 0:
            with self._lock:
                hit = self._cache.get(key)
            if hit and time.monotonic() - hit[0] < ttl:
                return hit[1]
        rows = self._fixture(name, params) if self.s.emachine_mode == "fixtures" else self._live(sql)
        if cache and ttl > 0:
            with self._lock:
                self._cache[key] = (time.monotonic(), rows)
        return rows

    def run_sql(self, sql: str) -> list[Row]:
        """Run an ad-hoc configured query (e.g. the optional issues query)."""
        if self.s.emachine_mode == "fixtures":
            return self._fixture("issues", {})
        return self._live(sql)

    def clear_cache(self) -> None:
        with self._lock:
            self._cache.clear()

    def _live(self, sql: str) -> list[Row]:
        if not self.s.emachine_url:
            raise EmachineError("eMachine base URL is not configured")
        headers = {"Accept": "application/json"}
        if self.s.emachine_token:
            headers["Authorization"] = f"Bearer {self.s.emachine_token}"
        try:
            res = self._http.get(self.s.emachine_url, params={"query": encode_query(sql)}, headers=headers)
        except httpx.HTTPError as e:
            raise EmachineError(f"eMachine unreachable: {e.__class__.__name__}") from e
        if res.status_code >= 400:
            raise EmachineError(f"eMachine returned HTTP {res.status_code}")
        try:
            return extract_rows(res.json())
        except json.JSONDecodeError as e:
            raise EmachineError("eMachine returned a non-JSON response") from e

    def _fixture(self, name: str, params: dict[str, str]) -> list[Row]:
        path: Path = self.s.fixtures_dir / f"{name}.json"
        if not path.exists():
            return []
        rows = extract_rows(json.loads(path.read_text(encoding="utf-8")))
        if "tag_id" in params:  # line fixtures hold every tag's lines
            rows = [r for r in rows if str(r.get("tag_id")) == str(params["tag_id"])]
        return rows


_client: EmachineClient | None = None


def get_emachine() -> EmachineClient:
    global _client
    if _client is None:
        _client = EmachineClient(get_settings())
    return _client


def set_emachine(client: EmachineClient | None) -> None:
    """Swap the shared client (tests)."""
    global _client
    _client = client
