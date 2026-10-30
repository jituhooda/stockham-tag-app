"""The committed API contract matches the code, and responses match the contract."""

import json

import jsonschema
import pytest

from apexapp.utils.export_openapi import build, postman_collection
from apexapp.utils.testing import TINY_PNG, sample_tag

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

SPEC = json.loads((ROOT / "api" / "openapi.json").read_text())


def test_committed_spec_is_current():
    assert build() == SPEC, "api/openapi.json is stale; run: cd backend && uv run python -m apexapp.utils.export_openapi"


def test_postman_collection_is_current():
    committed = json.loads((ROOT / "api" / "postman-collection.json").read_text())
    assert postman_collection(SPEC) == committed


def _validate(body, schema_name):
    # Embed components so the spec's "#/components/..." references resolve.
    schema = {**SPEC["components"]["schemas"][schema_name], "components": SPEC["components"]}
    jsonschema.validate(body, schema)


@pytest.mark.parametrize("path,schema", [
    ("/api/v1/tags", "TagList"),
    ("/api/v1/tags/e9001", "TagDetail"),
    ("/api/v1/me", "Me"),
])
def test_get_responses_match_schema(client, path, schema):
    _validate(client.get(path).json(), schema)


def test_write_responses_match_schema(client):
    tag = client.post("/api/v1/tags", json=sample_tag()).json()
    _validate(tag, "TagDetail")
    signed = client.post(f"/api/v1/tags/{tag['id']}/submit", json={"approver": "A", "mode": "in-person", "image": TINY_PNG}).json()
    _validate(signed, "TagDetail")
    err = client.get("/api/v1/tags/999999").json()
    _validate({k: err[k] for k in ("detail", "problems")}, "Problem")


def test_every_route_is_documented(client):
    documented = {(m.upper(), p) for p, ops in SPEC["paths"].items() for m in ops}
    assert ("POST", "/api/v1/tags/{tag_id}/submit") in documented
    assert all(p.startswith(("/api/v1/", "/health/")) for _, p in documented)
