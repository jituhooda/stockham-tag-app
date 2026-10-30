from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import Connection

from ...config import User
from ...rbac import Permission
from ...repositories import approvers as repo
from ...schemas import Approver, ApproverCreate
from ..dependencies import get_connection, require

router = APIRouter(prefix="/approvers", tags=["approvers"])


@router.get("", response_model=list[Approver], summary="Approvers known for a customer")
def list_approvers(customer: str = Query(min_length=1, max_length=255), conn: Connection = Depends(get_connection),
                   _: User = Depends(require(Permission.TAGS_READ))):
    return repo.list_for_customer(conn, customer)


@router.post("", response_model=Approver, status_code=status.HTTP_201_CREATED, summary="Add (or update) an approver")
def add_approver(body: ApproverCreate, conn: Connection = Depends(get_connection),
                 _: User = Depends(require(Permission.APPROVERS_WRITE))):
    return repo.upsert(conn, body.customer, body.name, body.email)
