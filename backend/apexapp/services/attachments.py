from __future__ import annotations

from sqlalchemy import Connection

from ..config import User, get_settings
from ..models import EDITABLE_STATUSES
from ..repositories import attachments as repo
from ..repositories import tags as tag_repo
from ..utils.time import as_utc, utcnow
from . import storage
from .errors import Conflict, Invalid, NotFound

# Leading bytes of the formats we accept, so a renamed executable can't pass as a PDF.
SIGNATURES = {
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/png": [b"\x89PNG"],
    "image/gif": [b"GIF8"],
    "image/webp": [b"RIFF"],
    "application/pdf": [b"%PDF"],
    "application/msword": [b"\xd0\xcf\x11\xe0"],
    "application/vnd.ms-excel": [b"\xd0\xcf\x11\xe0"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [b"PK"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [b"PK"],
}


def _clean_name(name: str) -> str:
    name = name.replace("\\", "/").rsplit("/", 1)[-1].strip() or "file"
    return "".join(c for c in name if c.isprintable() and c not in '<>:"|?*')[:255]


def add(conn: Connection, tag_id: int, file_name: str, content_type: str, data: bytes, user: User) -> dict:
    s = get_settings()
    tag = tag_repo.get_tag(conn, tag_id)
    if not tag:
        raise NotFound("Tag not found")
    if tag["status"] not in EDITABLE_STATUSES:
        raise Conflict("Attachments can't be changed on a submitted tag")
    content_type = (content_type or "").split(";")[0].strip().lower()
    if content_type not in s.upload_allowed_types:
        raise Invalid(f"Files of type {content_type or 'unknown'} aren't allowed")
    if not data:
        raise Invalid("The file is empty")
    if len(data) > s.upload_max_bytes:
        raise Invalid(f"Files must be {s.upload_max_bytes // (1024 * 1024)} MB or smaller")
    magic = SIGNATURES.get(content_type)
    if magic and not any(data.startswith(sig) for sig in magic):
        raise Invalid("The file's contents don't match its type")

    key = storage.new_key()
    storage.write(key, data)
    now = utcnow()
    att_id = repo.insert(conn, {
        "tag_id": tag_id, "file_name": _clean_name(file_name), "content_type": content_type,
        "size_bytes": len(data), "storage_key": key, "uploaded_by": user.name, "created_at": now,
    })
    tag_repo.update_tag(conn, tag_id, {"updated_at": now})
    return to_api(repo.get(conn, att_id))  # type: ignore[arg-type]


def to_api(a: dict) -> dict:
    return {"id": a["id"], "name": a["file_name"], "contentType": a["content_type"], "size": a["size_bytes"],
            "url": f"/api/v1/attachments/{a['id']}", "createdAt": as_utc(a["created_at"])}


def get(conn: Connection, attachment_id: int) -> dict:
    a = repo.get(conn, attachment_id)
    if not a:
        raise NotFound("Attachment not found")
    return a


def remove(conn: Connection, tag_id: int, attachment_id: int) -> str:
    a = repo.get(conn, attachment_id)
    if not a or a["tag_id"] != tag_id:
        raise NotFound("Attachment not found")
    tag = tag_repo.get_tag(conn, tag_id)
    if tag and tag["status"] not in EDITABLE_STATUSES:
        raise Conflict("Attachments can't be changed on a submitted tag")
    repo.delete(conn, attachment_id)
    return a["storage_key"]
