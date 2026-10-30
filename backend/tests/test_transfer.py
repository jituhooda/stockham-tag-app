import os

import pytest
from sqlalchemy import func, select

from apexapp.database.connection import create_db_engine
from apexapp.database.transfer import transfer
from apexapp.schema import tag_labor, tags
from apexapp.utils.testing import reset_postgres, sample_tag, app_client


def test_transfer_copies_everything(tmp_path):
    src_url = f"sqlite:///{tmp_path / 'src.db'}"
    with app_client(tmp_path, database_url=src_url) as client:
        for i in range(3):
            client.post("/api/v1/tags", json=sample_tag(tagNumber=f"T-{i}"))

    target_url = os.environ.get("TEST_DATABASE_URL") or f"sqlite:///{tmp_path / 'dst.db'}"
    if target_url.startswith("postgres"):
        reset_postgres(target_url)
    src, dst = create_db_engine(src_url), create_db_engine(target_url)
    counts = transfer(src, dst)
    assert counts["tags"] == 3 and counts["tag_labor"] == 3
    with dst.connect() as conn:
        assert conn.execute(select(func.count()).select_from(tags)).scalar() == 3
        assert conn.execute(select(func.count()).select_from(tag_labor)).scalar() == 3

    # New rows must not collide with copied ids.
    with dst.begin() as conn:
        from apexapp.crud import insert_row
        from apexapp.utils.time import utcnow
        new_id = insert_row(conn, tags, {"tag_number": "N", "created_at": utcnow(), "updated_at": utcnow()})
    assert new_id == 4

    with pytest.raises(RuntimeError, match="already has tags"):
        transfer(src, dst)
