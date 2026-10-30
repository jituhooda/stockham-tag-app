from __future__ import annotations

from pydantic import BaseModel


class Employee(BaseModel):
    id: str
    employee: str
    name: str
    division: str = ""


class MasterItem(BaseModel):
    id: str
    label: str
    defaultAmount: float | None = None


class Trade(BaseModel):
    label: str


class Job(BaseModel):
    jobNo: str
    jobName: str
    label: str
    customerId: str = ""
    customerName: str = ""
    address: str = ""
    pmEmail: str = ""


class Division(BaseModel):
    employee: str
    divisions: list[str]
