"""Business rules a tag must meet before it can be submitted."""

from __future__ import annotations

import base64
import re

from ..models import SignatureMode

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
PNG_PREFIX = "data:image/png;base64,"


def submit_problems(tag: dict) -> list[str]:
    p: list[str] = []
    if not tag.get("jobNo") and not tag.get("jobName"):
        p.append("Select a job on the Details tab")
    if not str(tag.get("description", "")).strip():
        p.append("Add a description on the Details tab")
    labor, materials = tag.get("labor", []), tag.get("materials", [])
    equipment, expenses = tag.get("equipment", []), tag.get("expenses", [])
    if not (labor or materials or equipment or expenses):
        p.append("Add at least one cost line")
    if any(not l.get("employeeName") for l in labor):
        p.append("Every labor line needs a resource")
    if any(not l.get("description") for l in materials + equipment):
        p.append("Every material and equipment line needs a description")
    if any(not l.get("description") or not float(l.get("amount") or 0) > 0 for l in expenses):
        p.append("Every expense needs a type and an amount")
    return p


def signature_problems(mode: SignatureMode, email: str, image: str, max_bytes: int) -> list[str]:
    p: list[str] = []
    if mode == SignatureMode.IN_PERSON:
        if not image.startswith(PNG_PREFIX):
            p.append("The approver needs to sign")
        else:
            try:
                raw = base64.b64decode(image[len(PNG_PREFIX):], validate=True)
            except ValueError:
                raw = b""
            if not raw.startswith(b"\x89PNG"):
                p.append("The signature image is not a valid PNG")
            elif len(raw) > max_bytes:
                p.append("The signature image is too large")
    elif not EMAIL_RE.match(email or ""):
        p.append("Enter a valid email to send the tag to")
    return p
