import json
from pathlib import Path

import jsonschema
import pytest

from apexapp.config import load_settings

CONFIG = Path(__file__).resolve().parents[2] / "config"
SCHEMA = json.loads((CONFIG / "config.schema.json").read_text())


@pytest.mark.parametrize("name", ["app", "database", "branding", "features", "integrations", "security", "logging"])
def test_config_file_matches_schema(name):
    data = json.loads((CONFIG / f"{name}.config.json").read_text())
    jsonschema.validate(data, {**SCHEMA["definitions"][name], "definitions": SCHEMA["definitions"]})


def test_env_overrides(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://u@h/db")
    monkeypatch.setenv("AUTH_MODE", "token")
    monkeypatch.setenv("AUTH_TOKENS", '{"abc": {"name": "Sean", "role": "approver"}}')
    monkeypatch.setenv("CORS_ORIGINS", "https://a.example, https://b.example")
    s = load_settings()
    assert s.database_url == "postgresql+psycopg://u@h/db"
    assert s.auth_tokens["abc"].role == "approver"
    assert s.cors_origins == ["https://a.example", "https://b.example"]


def test_public_config_hides_server_details():
    public = json.dumps(load_settings().public())
    assert "select" not in public.lower() and "token" not in public.lower().replace('"auth"', "")
