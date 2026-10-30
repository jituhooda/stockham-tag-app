from apexapp.utils.testing import TINY_PNG, TINY_PNG_BYTES, sample_tag


def test_health(client):
    assert client.get("/health/live").json() == {"status": "ok"}
    ready = client.get("/health/ready").json()
    assert ready["database"]["status"] == "ok" and ready["database"]["schemaVersion"] == "0002"


def test_master_data(client):
    assert [e["name"] for e in client.get("/api/v1/master/employees").json()][0] == "Jacob S Adams"
    assert [t["label"] for t in client.get("/api/v1/master/trades").json()] == ["Drywall", "Framing", "Taping"]
    expenses = {e["label"]: e["defaultAmount"] for e in client.get("/api/v1/master/expenses").json()}
    assert expenses["Parking"] == 35 and expenses["Mileage"] is None
    assert client.get("/api/v1/master/jobs", params={"division": "DFH"}).json()[0]["customerName"] == "Principal Builders"
    assert client.get("/api/v1/master/division", params={"employee": "Sean"}).json()["divisions"] == ["DFH"]


def test_list_includes_emachine_tags(client):
    items = client.get("/api/v1/tags").json()["items"]
    assert {t["id"] for t in items} == {"e9001", "e9002"}
    assert items[0]["tagNumber"] == "D4355-1"


def test_create_update_and_read_tag(client):
    created = client.post("/api/v1/tags", json=sample_tag()).json()
    tag_id = created["id"]
    assert created["status"] == "Draft" and created["editable"] and created["labor"][0]["regular"] == 7

    body = sample_tag(description="Changed", expenses=[{"description": "Parking", "amount": 40.5}], issues=["a", "a", " b "])
    updated = client.put(f"/api/v1/tags/{tag_id}", json=body).json()
    assert updated["description"] == "Changed"
    assert updated["expenses"] == [{"description": "Parking", "amount": 40.5}]
    assert updated["issues"] == ["a", "b"]

    listed = {t["id"]: t for t in client.get("/api/v1/tags").json()["items"]}
    assert listed[tag_id]["counts"] == {"labor": 1, "material": 1, "equipment": 1, "expense": 1}


def test_new_tag_gets_a_number(client):
    created = client.post("/api/v1/tags", json=sample_tag(tagNumber="")).json()
    assert created["tagNumber"] == "NEW-1"


def test_emachine_tag_is_imported_on_save(client):
    remote = client.get("/api/v1/tags/e9001").json()
    assert remote["source"] == "emachine" and remote["labor"][0]["employeeName"] == "Jacob S Adams"
    assert len(remote["equipment"]) == 2

    saved = client.put("/api/v1/tags/e9001", json={**{k: remote[k] for k in sample_tag()}, "description": "edited"}).json()
    assert saved["source"] == "local" and saved["id"].isdigit() and saved["description"] == "edited"

    ids = {t["id"] for t in client.get("/api/v1/tags").json()["items"]}
    assert "e9001" not in ids and saved["id"] in ids
    assert client.get("/api/v1/tags/e9001").json()["id"] == saved["id"]


def test_submit_in_person_locks_tag(client):
    tag_id = client.post("/api/v1/tags", json=sample_tag()).json()["id"]
    bad = client.post(f"/api/v1/tags/{tag_id}/submit", json={"approver": "Sean", "mode": "in-person", "image": ""})
    assert bad.status_code == 422 and "The approver needs to sign" in bad.json()["problems"]

    ok = client.post(f"/api/v1/tags/{tag_id}/submit", json={"approver": "Sean Hubert", "mode": "in-person", "image": TINY_PNG})
    assert ok.status_code == 200
    tag = ok.json()
    assert tag["status"] == "Signed" and not tag["editable"] and tag["signature"]["signedAt"]

    assert client.put(f"/api/v1/tags/{tag_id}", json=sample_tag()).status_code == 409
    assert client.post(f"/api/v1/tags/{tag_id}/approve").json()["status"] == "Approved"


def test_send_for_signature_and_reject(client):
    tag_id = client.post("/api/v1/tags", json=sample_tag()).json()["id"]
    tag = client.post(f"/api/v1/tags/{tag_id}/submit", json={"approver": "Sean", "mode": "send", "email": "sean@example.com"}).json()
    assert tag["status"] == "Submitted" and tag["signature"]["image"] == ""
    assert client.post(f"/api/v1/tags/{tag_id}/reject").json()["editable"] is True


def test_submit_reports_incomplete_tag(client):
    tag_id = client.post("/api/v1/tags", json=sample_tag(labor=[], materials=[], equipment=[], expenses=[])).json()["id"]
    r = client.post(f"/api/v1/tags/{tag_id}/submit", json={"approver": "Sean", "mode": "send", "email": "s@e.co"})
    assert r.status_code == 422 and r.json()["problems"] == ["Add at least one cost line"]


def test_attachments_roundtrip(client):
    tag_id = client.post("/api/v1/tags", json=sample_tag()).json()["id"]
    up = client.post(f"/api/v1/tags/{tag_id}/attachments", files={"file": ("receipt.png", TINY_PNG_BYTES, "image/png")})
    assert up.status_code == 201, up.text
    att = up.json()
    got = client.get(att["url"])
    assert got.status_code == 200 and got.content == TINY_PNG_BYTES and got.headers["content-type"] == "image/png"
    assert client.get(f"/api/v1/tags/{tag_id}").json()["attachments"][0]["name"] == "receipt.png"
    assert client.delete(f"/api/v1/tags/{tag_id}/attachments/{att['id']}").status_code == 204
    assert client.get(att["url"]).status_code == 404


def test_delete_tag(client):
    tag_id = client.post("/api/v1/tags", json=sample_tag()).json()["id"]
    assert client.delete(f"/api/v1/tags/{tag_id}").status_code == 204
    assert client.get(f"/api/v1/tags/{tag_id}").status_code == 404
    assert client.delete("/api/v1/tags/e9001").status_code == 409


def test_approvers(client):
    assert client.post("/api/v1/approvers", json={"customer": "Principal Builders", "name": "Sean Hubert"}).status_code == 201
    client.post("/api/v1/approvers", json={"customer": "principal builders", "name": "sean hubert", "email": "s@pb.com"})
    rows = client.get("/api/v1/approvers", params={"customer": "Principal Builders"}).json()
    assert len(rows) == 1 and rows[0]["email"] == "s@pb.com"


def test_errors_have_consistent_shape(client):
    r = client.get("/api/v1/tags/not-an-id")
    assert r.status_code == 404 and set(r.json()) == {"detail", "problems", "requestId"}
    r = client.post("/api/v1/tags", json={"labor": [{"regular": -1}]})
    assert r.status_code == 422 and r.json()["problems"]


def test_metrics(client):
    client.get("/api/v1/tags/123")
    text = client.get("/metrics").text
    assert 'route="/api/v1/tags/{tag_id}"' in text
