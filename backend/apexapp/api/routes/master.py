from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from ...integrations.emachine import EmachineClient
from ...rbac import Permission
from ...schemas import Division, Employee, Issue, Job, MasterItem, Trade
from ...services import master_data
from ..dependencies import emachine, require

router = APIRouter(prefix="/master", tags=["master data"], dependencies=[Depends(require(Permission.MASTER_READ))])


@router.get("/employees", response_model=list[Employee], summary="Active employees")
def employees(client: EmachineClient = Depends(emachine)):
    return master_data.employees(client)


@router.get("/materials", response_model=list[MasterItem], summary="Material descriptions")
def materials(client: EmachineClient = Depends(emachine)):
    return master_data.items(client, "materials")


@router.get("/equipment", response_model=list[MasterItem], summary="Equipment descriptions")
def equipment(client: EmachineClient = Depends(emachine)):
    return master_data.items(client, "equipment")


@router.get("/expenses", response_model=list[MasterItem], summary="Expense types")
def expenses(client: EmachineClient = Depends(emachine)):
    return master_data.items(client, "expenses")


@router.get("/trades", response_model=list[Trade], summary="Labor trades (from tag_labor_rates)")
def trades(client: EmachineClient = Depends(emachine)):
    return master_data.trades(client)


@router.get("/jobs", response_model=list[Job], summary="Jobs for the given divisions")
def jobs(division: list[str] = Query(default_factory=list), client: EmachineClient = Depends(emachine)):
    return master_data.jobs(client, division)


@router.get("/division", response_model=Division, summary="Divisions an employee belongs to")
def division(employee: str = Query(min_length=1, max_length=100), client: EmachineClient = Depends(emachine)):
    return master_data.division(client, employee)


@router.get("/issues", response_model=list[Issue], summary="Issues a tag can be linked to (if configured)")
def issues(client: EmachineClient = Depends(emachine)):
    return master_data.issues(client)
