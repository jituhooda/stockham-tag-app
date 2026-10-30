"""Domain vocabulary for tags, shared by services and API schemas."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class TagStatus(str, Enum):
    DRAFT = "Draft"
    SUBMITTED = "Submitted"
    SIGNED = "Signed"
    APPROVED = "Approved"
    REJECTED = "Rejected"


EDITABLE_STATUSES = {TagStatus.DRAFT.value, TagStatus.REJECTED.value}


class SignatureMode(str, Enum):
    IN_PERSON = "in-person"
    SEND = "send"


@dataclass(frozen=True)
class TagRef:
    """A tag id as the API sees it.

    ``"12"`` is a tag stored in this app's database. ``"e345"`` is a tag that
    so far exists only in eMachine (its Id there is 345); the first save copies
    it into our database.
    """

    local_id: int | None = None
    external_id: int | None = None

    def __str__(self) -> str:
        return str(self.local_id) if self.local_id is not None else f"e{self.external_id}"


def parse_tag_ref(raw: str) -> TagRef | None:
    raw = raw.strip()
    if raw.isdigit():
        return TagRef(local_id=int(raw))
    if raw[:1] == "e" and raw[1:].isdigit():
        return TagRef(external_id=int(raw[1:]))
    return None
