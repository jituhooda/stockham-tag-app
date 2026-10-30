from apexapp.database import backup
from apexapp.utils.testing import TINY_PNG_BYTES, app_client, sample_tag


def test_backup_and_restore_roundtrip(tmp_path):
    with app_client(tmp_path) as client:
        tid = client.post("/api/v1/tags", json=sample_tag()).json()["id"]
        client.post(f"/api/v1/tags/{tid}/attachments", files={"file": ("p.png", TINY_PNG_BYTES, "image/png")})
        out = backup.create(tmp_path / "backups")
        import json
        db_file = json.loads((out / "manifest.json").read_text())["databaseFile"]
        assert db_file in ("db.sqlite3", "db.pgdump")
        assert {p.name for p in out.iterdir()} == {db_file, "attachments.tar.gz", "manifest.json"}

        client.delete(f"/api/v1/tags/{tid}")
        assert client.get(f"/api/v1/tags/{tid}").status_code == 404

        backup.restore(out, assume_yes=True)
        tag = client.get(f"/api/v1/tags/{tid}").json()
        assert client.get(tag["attachments"][0]["url"]).content == TINY_PNG_BYTES
