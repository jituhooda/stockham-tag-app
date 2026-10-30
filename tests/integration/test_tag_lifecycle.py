"""End-to-end API journeys across services, the database and the eMachine integration."""

from apexapp.utils.testing import TINY_PNG, TINY_PNG_BYTES, sample_tag


def test_draft_to_approved(client):
    tag = client.post("/api/v1/tags", json=sample_tag()).json()
    tid = tag["id"]
    client.post(f"/api/v1/tags/{tid}/attachments", files={"file": ("photo.png", TINY_PNG_BYTES, "image/png")})
    signed = client.post(f"/api/v1/tags/{tid}/submit", json={"approver": "Sean Hubert", "mode": "in-person", "image": TINY_PNG}).json()
    assert signed["status"] == "Signed"
    # Locked: no edits, no new files, no deletion.
    assert client.put(f"/api/v1/tags/{tid}", json=sample_tag()).status_code == 409
    assert client.post(f"/api/v1/tags/{tid}/attachments", files={"file": ("x.png", TINY_PNG_BYTES, "image/png")}).status_code == 409
    assert client.delete(f"/api/v1/tags/{tid}").status_code == 409
    assert client.post(f"/api/v1/tags/{tid}/approve").json()["status"] == "Approved"
    assert client.post(f"/api/v1/tags/{tid}/reject").status_code == 409


def test_rejected_tag_can_be_fixed_and_resubmitted(client):
    tid = client.post("/api/v1/tags", json=sample_tag()).json()["id"]
    client.post(f"/api/v1/tags/{tid}/submit", json={"approver": "Sean", "mode": "send", "email": "s@pb.com"})
    assert client.post(f"/api/v1/tags/{tid}/reject").json()["status"] == "Rejected"
    fixed = client.put(f"/api/v1/tags/{tid}", json=sample_tag(description="Corrected hours")).json()
    assert fixed["description"] == "Corrected hours" and fixed["status"] == "Rejected"
    again = client.post(f"/api/v1/tags/{tid}/submit", json={"approver": "Sean", "mode": "in-person", "image": TINY_PNG}).json()
    assert again["status"] == "Signed"


def test_emachine_tag_import_on_first_upload(client):
    """Uploading to an eMachine tag copies it into the database, keeping its lines."""
    r = client.post("/api/v1/tags/e9001/attachments", files={"file": ("p.png", TINY_PNG_BYTES, "image/png")})
    assert r.status_code == 201
    tag = client.get("/api/v1/tags/e9001").json()
    assert tag["source"] == "local" and len(tag["attachments"]) == 1
    assert [l["description"] for l in tag["equipment"]] == ["Scissor Lift", "Welding Machine"]


def test_emachine_outage_degrades_gracefully(make_client):
    with make_client(EMACHINE_MODE="live", EMACHINE_BASE_URL="http://127.0.0.1:9/unreachable") as c:
        c.post("/api/v1/tags", json=sample_tag())
        listing = c.get("/api/v1/tags").json()
        assert len(listing["items"]) == 1 and "unavailable" in listing["warnings"][0]
        r = c.get("/api/v1/master/employees")
        assert r.status_code == 502 and "unreachable" in r.json()["detail"]
