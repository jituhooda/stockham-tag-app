from __future__ import annotations

import datetime as dt
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from ..models import SignatureMode

NonNeg = Field(default=0, ge=0, le=1_000_000)


class LaborLine(BaseModel):
    employeeId: str = Field(default="", max_length=50)
    employeeName: str = Field(default="", max_length=255)
    trade: str = Field(default="", max_length=100)
    regular: float = NonNeg
    overtime: float = NonNeg
    doubleTime: float = NonNeg


class MaterialLine(BaseModel):
    description: str = Field(default="", max_length=255)
    qty: float = NonNeg
    length: float | None = Field(default=None, ge=0, le=1_000_000)


class EquipmentLine(BaseModel):
    description: str = Field(default="", max_length=255)
    qty: float = NonNeg


class ExpenseLine(BaseModel):
    description: str = Field(default="", max_length=255)
    amount: float = NonNeg


class Signature(BaseModel):
    approver: str = Field(default="", max_length=255)
    mode: SignatureMode = SignatureMode.IN_PERSON
    email: str = Field(default="", max_length=255)
    image: str = ""
    signedAt: dt.datetime | None = None


class Attachment(BaseModel):
    id: int
    name: str
    contentType: str
    size: int
    url: str
    createdAt: dt.datetime


class Counts(BaseModel):
    labor: int = 0
    material: int = 0
    equipment: int = 0
    expense: int = 0


class TagSummary(BaseModel):
    id: str
    source: Literal["local", "emachine"]
    tagNumber: str
    status: str
    description: str
    tagDate: dt.date | None
    jobNo: str
    jobName: str
    updatedAt: dt.date | None
    counts: Counts


class TagList(BaseModel):
    items: list[TagSummary]
    warnings: list[str] = Field(default_factory=list)


class TagFields(BaseModel):
    tagNumber: str = Field(default="", max_length=50)
    description: str = Field(default="", max_length=5000)
    tagDate: dt.date | None = None
    isPremium: bool = False
    jobNo: str = Field(default="", max_length=50)
    jobName: str = Field(default="", max_length=255)
    customerId: str = Field(default="", max_length=50)
    customerName: str = Field(default="", max_length=255)
    pmEmail: str = Field(default="", max_length=255)
    address: str = Field(default="", max_length=500)
    labor: list[LaborLine] = Field(default_factory=list, max_length=200)
    materials: list[MaterialLine] = Field(default_factory=list, max_length=200)
    equipment: list[EquipmentLine] = Field(default_factory=list, max_length=200)
    expenses: list[ExpenseLine] = Field(default_factory=list, max_length=200)
    issues: list[str] = Field(default_factory=list, max_length=100)

    @field_validator("issues")
    @classmethod
    def _issues(cls, v: list[str]) -> list[str]:
        seen: list[str] = []
        for item in (s.strip()[:1000] for s in v):
            if item and item not in seen:
                seen.append(item)
        return seen


class TagUpdate(TagFields):
    """Full replacement of a tag's editable content (status and signature excluded)."""


class TagDetail(TagFields):
    id: str
    source: Literal["local", "emachine"]
    status: str
    editable: bool
    createdBy: str = ""
    updatedAt: dt.datetime | None = None
    submittedAt: dt.datetime | None = None
    signature: Signature = Field(default_factory=Signature)
    attachments: list[Attachment] = Field(default_factory=list)


class SubmitRequest(BaseModel):
    approver: str = Field(min_length=1, max_length=255)
    mode: SignatureMode
    email: str = Field(default="", max_length=255)
    image: str = Field(default="", description="PNG data URL; required when mode is in-person")
