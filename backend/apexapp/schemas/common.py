from __future__ import annotations

from pydantic import BaseModel, Field


class Problem(BaseModel):
    detail: str
    problems: list[str] = Field(default_factory=list)


class Me(BaseModel):
    name: str
    role: str
    permissions: list[str]


class Approver(BaseModel):
    id: int
    customer: str
    name: str
    email: str = ""


class ApproverCreate(BaseModel):
    customer: str = Field(min_length=1, max_length=255)
    name: str = Field(min_length=1, max_length=255)
    email: str = Field(default="", max_length=255)


class Issue(BaseModel):
    label: str
