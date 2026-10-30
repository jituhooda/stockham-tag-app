"""Tag lifecycle: list, read, save, submit, delete.

Tags are stored in this app's database. Tags that so far exist only in
eMachine are listed alongside them (id ``e<Id>``) and are copied into the
database the first time they are saved.
"""

from __future__ import annotations

import datetime as dt
import logging

from sqlalchemy import Connection

from ..config import User, get_settings
from ..integrations import emachine_mapping as m
from ..integrations.emachine import EmachineClient, EmachineError
from ..models import EDITABLE_STATUSES, SignatureMode, TagRef, TagStatus, parse_tag_ref
from ..repositories import attachments as attachment_repo
from ..repositories import tags as repo
from ..schemas import SubmitRequest, TagUpdate
from ..utils.time import as_utc, utcnow
from .errors import Conflict, Invalid, NotFound, UpstreamUnavailable
from .validation import signature_problems, submit_problems

log = logging.getLogger(__name__)


def ref_or_404(raw: str) -> TagRef:
    ref = parse_tag_ref(raw)
    if ref is None:
        raise NotFound("Tag not found")
    return ref


def _date(v) -> dt.date | None:
    if isinstance(v, dt.datetime):
        return v.date()
    if isinstance(v, dt.date):
        return v
    if isinstance(v, str) and v:
        try:
            return dt.date.fromisoformat(v[:10])
        except ValueError:
            return None
    return None


# -- listing -----------------------------------------------------------------

def list_tags(conn: Connection, client: EmachineClient) -> dict:
    items = [
        {
            "id": str(r["id"]),
            "source": "local",
            "tagNumber": r["tag_number"],
            "status": r["status"],
            "description": r["description"],
            "tagDate": _date(r["tag_date"]),
            "jobNo": r["job_no"],
            "jobName": r["job_name"],
            "updatedAt": _date(r["updated_at"]),
            "counts": {"labor": r["labor_count"], "material": r["material_count"],
                       "equipment": r["equipment_count"], "expense": r["expense_count"]},
        }
        for r in repo.list_tags(conn)
    ]
    warnings: list[str] = []
    if get_settings().features.get("showEmachineTags", True):
        try:
            imported = repo.external_ids(conn)
            for row in client.run("tags"):
                h = m.tag_header(row)
                if not h["external_id"] or h["external_id"] in imported:
                    continue
                items.append({
                    "id": f"e{h['external_id']}",
                    "source": "emachine",
                    "tagNumber": h["tag_number"],
                    "status": h["status"],
                    "description": h["description"],
                    "tagDate": _date(h["tag_date"]),
                    "jobNo": h["job_no"],
                    "jobName": h["job_name"],
                    "updatedAt": _date(h["updated"]),
                    "counts": h["counts"],
                })
        except EmachineError as e:
            log.warning("Could not load eMachine tags: %s", e)
            warnings.append(f"Tags from eMachine are unavailable ({e}).")
    items.sort(key=lambda t: (t["updatedAt"] or dt.date.min), reverse=True)
    return {"items": items, "warnings": warnings}


# -- reading -----------------------------------------------------------------

def _local_detail(conn: Connection, row: dict) -> dict:
    tag_id = row["id"]
    sig = repo.load_signature(conn, tag_id) or {}
    return {
        "id": str(tag_id),
        "source": "local",
        "tagNumber": row["tag_number"],
        "status": row["status"],
        "editable": row["status"] in EDITABLE_STATUSES,
        "description": row["description"],
        "tagDate": _date(row["tag_date"]),
        "isPremium": bool(row["is_premium"]),
        "jobNo": row["job_no"],
        "jobName": row["job_name"],
        "customerId": row["customer_id"],
        "customerName": row["customer_name"],
        "pmEmail": row["pm_email"],
        "address": row["address"],
        "createdBy": row["created_by"],
        "updatedAt": as_utc(row["updated_at"]),
        "submittedAt": as_utc(row["submitted_at"]),
        **repo.load_lines(conn, tag_id),
        "issues": repo.load_issues(conn, tag_id),
        "signature": {
            "approver": sig.get("approver", ""),
            "mode": sig.get("mode", SignatureMode.IN_PERSON.value),
            "email": sig.get("email", ""),
            "image": sig.get("image_png", ""),
            "signedAt": as_utc(sig.get("signed_at")),
        },
        "attachments": [
            {"id": a["id"], "name": a["file_name"], "contentType": a["content_type"], "size": a["size_bytes"],
             "url": f"/api/v1/attachments/{a['id']}", "createdAt": as_utc(a["created_at"])}
            for a in attachment_repo.list_for_tag(conn, tag_id)
        ],
    }


def _remote_header(client: EmachineClient, external_id: int) -> dict:
    try:
        rows = client.run("tags")
    except EmachineError as e:
        raise UpstreamUnavailable(str(e)) from e
    for r in rows:
        h = m.tag_header(r)
        if h["external_id"] == external_id:
            return h
    raise NotFound("Tag not found")


def _remote_lines(client: EmachineClient, external_id: int) -> dict:
    out = {}
    for key, query, mapper in (
        ("labor", "tagLabor", m.labor_line), ("materials", "tagMaterials", m.material_line),
        ("equipment", "tagEquipment", m.equipment_line), ("expenses", "tagExpenses", m.expense_line),
    ):
        try:
            out[key] = [mapper(r) for r in client.run(query, cache=False, tag_id=str(external_id))]
        except EmachineError as e:
            raise UpstreamUnavailable(str(e)) from e
    return out


def get_tag(conn: Connection, client: EmachineClient, raw_id: str) -> dict:
    ref = ref_or_404(raw_id)
    if ref.local_id is not None:
        row = repo.get_tag(conn, ref.local_id)
        if not row:
            raise NotFound("Tag not found")
        return _local_detail(conn, row)

    if existing := repo.find_by_external_id(conn, ref.external_id):  # already imported
        return _local_detail(conn, existing)
    h = _remote_header(client, ref.external_id)  # type: ignore[arg-type]
    return {
        "id": str(ref),
        "source": "emachine",
        "tagNumber": h["tag_number"],
        "status": h["status"],
        "editable": h["status"] in EDITABLE_STATUSES,
        "description": h["description"],
        "tagDate": _date(h["tag_date"]),
        "isPremium": h["is_premium"],
        "jobNo": h["job_no"],
        "jobName": h["job_name"],
        "customerId": h["customer_id"],
        "customerName": h["customer_name"],
        "pmEmail": h["pm_email"],
        "address": h["address"],
        **_remote_lines(client, ref.external_id),  # type: ignore[arg-type]
        "issues": [],
        "attachments": [],
    }


# -- writing -----------------------------------------------------------------

def _fields(body: TagUpdate) -> dict:
    return {
        "tag_number": body.tagNumber.strip(),
        "description": body.description,
        "tag_date": body.tagDate,
        "is_premium": body.isPremium,
        "job_no": body.jobNo,
        "job_name": body.jobName,
        "customer_id": body.customerId,
        "customer_name": body.customerName,
        "pm_email": body.pmEmail,
        "address": body.address,
    }


def _next_tag_number(conn: Connection) -> str:
    prefix = get_settings().app.get("tagNumberPrefix", "NEW")
    n = len([r for r in repo.list_tags(conn) if r["tag_number"].startswith(f"{prefix}-")]) + 1
    return f"{prefix}-{n}"


def create_tag(conn: Connection, body: TagUpdate, user: User) -> dict:
    now = utcnow()
    values = _fields(body)
    values["tag_number"] = values["tag_number"] or _next_tag_number(conn)
    values["tag_date"] = values["tag_date"] or now.date()
    tag_id = repo.insert_tag(conn, {**values, "status": TagStatus.DRAFT.value, "created_by": user.name,
                                    "created_at": now, "updated_at": now})
    _write_children(conn, tag_id, body)
    return _local_detail(conn, repo.get_tag(conn, tag_id))  # type: ignore[arg-type]


def _write_children(conn: Connection, tag_id: int, body: TagUpdate) -> None:
    repo.replace_lines(conn, tag_id, {
        "labor": [l.model_dump() for l in body.labor],
        "materials": [l.model_dump() for l in body.materials],
        "equipment": [l.model_dump() for l in body.equipment],
        "expenses": [l.model_dump() for l in body.expenses],
    })
    repo.replace_issues(conn, tag_id, body.issues)


def ensure_local(conn: Connection, client: EmachineClient, raw_id: str, user: User) -> int:
    """Return the local id for a tag, copying an eMachine tag into the database if needed."""
    ref = ref_or_404(raw_id)
    if ref.local_id is not None:
        if not repo.get_tag(conn, ref.local_id):
            raise NotFound("Tag not found")
        return ref.local_id
    if existing := repo.find_by_external_id(conn, ref.external_id):  # type: ignore[arg-type]
        return existing["id"]
    remote = get_tag(conn, client, raw_id)
    now = utcnow()
    status = remote["status"] if remote["status"] in {s.value for s in TagStatus} else TagStatus.DRAFT.value
    tag_id = repo.insert_tag(conn, {
        **_fields(TagUpdate(**{k: v for k, v in remote.items() if k in TagUpdate.model_fields})),
        "external_id": ref.external_id, "status": status, "created_by": user.name,
        "created_at": now, "updated_at": now,
    })
    _write_children(conn, tag_id, TagUpdate(**{k: v for k, v in remote.items() if k in TagUpdate.model_fields}))
    return tag_id


def update_tag(conn: Connection, client: EmachineClient, raw_id: str, body: TagUpdate, user: User) -> dict:
    tag_id = ensure_local(conn, client, raw_id, user)
    row = repo.get_tag(conn, tag_id)
    assert row is not None
    if row["status"] not in EDITABLE_STATUSES:
        raise Conflict(f"Tag is {row['status'].lower()} and can no longer be edited")
    values = _fields(body)
    values["tag_number"] = values["tag_number"] or row["tag_number"]
    repo.update_tag(conn, tag_id, {**values, "updated_at": utcnow()})
    _write_children(conn, tag_id, body)
    return _local_detail(conn, repo.get_tag(conn, tag_id))  # type: ignore[arg-type]


def submit_tag(conn: Connection, client: EmachineClient, raw_id: str, body: SubmitRequest, user: User) -> dict:
    tag_id = ensure_local(conn, client, raw_id, user)
    row = repo.get_tag(conn, tag_id)
    assert row is not None
    if row["status"] not in EDITABLE_STATUSES:
        raise Conflict(f"Tag is already {row['status'].lower()}")
    detail = _local_detail(conn, row)
    problems = submit_problems(detail) + signature_problems(
        body.mode, body.email, body.image, get_settings().max_signature_bytes)
    if problems:
        raise Invalid("The tag can't be submitted yet", problems)

    now = utcnow()
    in_person = body.mode == SignatureMode.IN_PERSON
    repo.save_signature(conn, tag_id, {
        "approver": body.approver.strip(),
        "mode": body.mode.value,
        "email": body.email.strip(),
        "image_png": body.image if in_person else "",
        "signed_at": now if in_person else None,
    })
    status = TagStatus.SIGNED if in_person else TagStatus.SUBMITTED
    repo.update_tag(conn, tag_id, {"status": status.value, "submitted_at": now, "updated_at": now})
    return _local_detail(conn, repo.get_tag(conn, tag_id))  # type: ignore[arg-type]


def set_status(conn: Connection, raw_id: str, status: TagStatus) -> dict:
    """Approver/admin decision on a submitted or signed tag."""
    ref = ref_or_404(raw_id)
    row = repo.get_tag(conn, ref.local_id) if ref.local_id is not None else None
    if not row:
        raise NotFound("Tag not found")
    if row["status"] not in (TagStatus.SUBMITTED.value, TagStatus.SIGNED.value):
        raise Conflict("Only submitted or signed tags can be approved or rejected")
    repo.update_tag(conn, row["id"], {"status": status.value, "updated_at": utcnow()})
    return _local_detail(conn, repo.get_tag(conn, row["id"]))  # type: ignore[arg-type]


def delete_tag(conn: Connection, raw_id: str) -> list[str]:
    """Delete a local tag; returns the attachment storage keys to remove after commit."""
    ref = ref_or_404(raw_id)
    if ref.local_id is None:
        raise Conflict("Tags that live in eMachine can't be deleted here")
    row = repo.get_tag(conn, ref.local_id)
    if not row:
        raise NotFound("Tag not found")
    if row["status"] not in EDITABLE_STATUSES:
        raise Conflict("Only draft or rejected tags can be deleted")
    keys = [a["storage_key"] for a in attachment_repo.list_for_tag(conn, ref.local_id)]
    repo.delete_tag(conn, ref.local_id)
    return keys
