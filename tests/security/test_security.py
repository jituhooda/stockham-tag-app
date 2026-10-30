"""Authentication, authorisation, input handling and HTTP hardening."""

import json

import pytest

from apexapp.integrations.emachine import sql_literal
from apexapp.utils.testing import TINY_PNG_BYTES, sample_tag

TOKENS = json.dumps({
    "admin-token-0123456789": {"name": "Admin", "role": "admin"},
    "viewer-token-0123456789": {"name": "Vic", "role": "viewer"},
    "editor-token-0123456789": {"name": "Ed", "role": "editor"},
})


def auth(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def secured(make_client):
    with make_client(AUTH_MODE="token", AUTH_TOKENS=TOKENS) as c:
        yield c


def test_token_mode_requires_a_valid_token(secured):
    assert secured.get("/api/v1/tags").status_code == 401
    assert secured.get("/api/v1/tags", headers=auth("wrong")).status_code == 401
    assert secured.get("/api/v1/tags", headers={"Authorization": "Basic abc"}).status_code == 401
    assert secured.get("/api/v1/tags", headers=auth("viewer-token-0123456789")).status_code == 200
    # Public endpoints stay open so the app can show its sign-in screen.
    assert secured.get("/api/v1/config").status_code == 200
    assert secured.get("/health/live").status_code == 200


def test_roles_are_enforced(secured):
    viewer, editor = auth("viewer-token-0123456789"), auth("editor-token-0123456789")
    assert secured.post("/api/v1/tags", json=sample_tag(), headers=viewer).status_code == 403
    tid = secured.post("/api/v1/tags", json=sample_tag(), headers=editor).json()["id"]
    secured.post(f"/api/v1/tags/{tid}/submit", headers=editor,
                 json={"approver": "A", "mode": "send", "email": "a@b.co"})
    assert secured.post(f"/api/v1/tags/{tid}/approve", headers=editor).status_code == 403
    assert secured.post(f"/api/v1/tags/{tid}/approve", headers=auth("admin-token-0123456789")).status_code == 200
    me = secured.get("/api/v1/me", headers=viewer).json()
    assert me["role"] == "viewer" and "tags:write" not in me["permissions"]


def test_created_by_comes_from_the_token_not_the_request(secured):
    tag = secured.post("/api/v1/tags", json=sample_tag(), headers={**auth("editor-token-0123456789"), "X-User-Name": "Mallory"}).json()
    assert tag["createdBy"] == "Ed"


def test_security_headers(client):
    r = client.get("/api/v1/tags")
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert r.headers["X-Frame-Options"] == "DENY"
    assert "default-src 'none'" in r.headers["Content-Security-Policy"]
    assert r.headers["X-Request-ID"]


def test_cors_only_for_configured_origins(client):
    allowed = client.options("/api/v1/tags", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"})
    assert allowed.headers.get("access-control-allow-origin") == "http://localhost:5173"
    denied = client.options("/api/v1/tags", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"})
    assert "access-control-allow-origin" not in denied.headers


@pytest.mark.parametrize("value", ["Sean' OR '1'='1", "x\\'; DROP TABLE job; --", "a''b"])
def test_sql_literal_cannot_break_out(value):
    lit = sql_literal(value)
    inner = lit[1:-1]
    # After un-escaping, the literal is exactly the input: no quote ends it early.
    assert inner.replace("''", "'").replace("\\\\", "\\") == value
    assert lit.startswith("'") and lit.endswith("'")


def test_division_lookup_rejects_oversized_input(client):
    assert client.get("/api/v1/master/division", params={"employee": "x" * 101}).status_code == 422
    assert client.get("/api/v1/master/jobs", params={"division": ["d"] * 21}).status_code == 422


def test_uploads_are_type_checked(client):
    tid = client.post("/api/v1/tags", json=sample_tag()).json()["id"]
    def up(name, data, ctype):
        return client.post(f"/api/v1/tags/{tid}/attachments", files={"file": (name, data, ctype)})
    assert up("evil.html", b"<script>alert(1)</script>", "text/html").status_code == 422
    assert up("fake.pdf", b"MZ\x90\x00 not a pdf", "application/pdf").status_code == 422
    ok = up("../../etc/passwd.png", TINY_PNG_BYTES, "image/png")
    assert ok.status_code == 201 and ok.json()["name"] == "passwd.png"


def test_oversized_upload_rejected(make_client, monkeypatch):
    with make_client() as c:
        from apexapp.config import get_settings
        get_settings().upload_max_bytes = 2048
        tid = c.post("/api/v1/tags", json=sample_tag()).json()["id"]
        big = TINY_PNG_BYTES + b"\0" * 4096
        r = c.post(f"/api/v1/tags/{tid}/attachments", files={"file": ("big.png", big, "image/png")})
        assert r.status_code == 422 and "MB or smaller" in r.json()["detail"]


def test_non_inline_types_download_as_attachment(client):
    tid = client.post("/api/v1/tags", json=sample_tag()).json()["id"]
    docx = b"PK\x03\x04" + b"\0" * 20
    att = client.post(f"/api/v1/tags/{tid}/attachments", files={"file": ("a.docx", docx,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}).json()
    assert client.get(att["url"]).headers["content-disposition"].startswith("attachment;")


@pytest.mark.parametrize("bad_id", ["..%2F..%2Fetc", "e-1", "1;DROP", "%00"])
def test_odd_tag_ids_are_404(client, bad_id):
    assert client.get(f"/api/v1/tags/{bad_id}").status_code == 404


def test_signature_must_be_a_real_png(client):
    tid = client.post("/api/v1/tags", json=sample_tag()).json()["id"]
    r = client.post(f"/api/v1/tags/{tid}/submit", json={"approver": "A", "mode": "in-person",
                    "image": "data:image/png;base64,PHN2Zz48L3N2Zz4="})
    assert r.status_code == 422 and "not a valid PNG" in r.json()["problems"][0]


def test_errors_do_not_leak_internals(client, monkeypatch):
    from apexapp.services import tags as svc
    def boom(*a, **k):
        raise RuntimeError("password=hunter2 at db.internal")
    monkeypatch.setattr(svc, "list_tags", boom)
    from fastapi.testclient import TestClient
    r = TestClient(client.app, raise_server_exceptions=False).get("/api/v1/tags")
    assert r.status_code == 500 and "hunter2" not in r.text
