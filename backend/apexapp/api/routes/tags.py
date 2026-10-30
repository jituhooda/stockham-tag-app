from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, Response, status
from sqlalchemy import Connection

from ...config import User
from ...integrations.emachine import EmachineClient
from ...models import TagStatus
from ...rbac import Permission
from ...schemas import Problem, SubmitRequest, TagDetail, TagList, TagUpdate
from ...services import storage
from ...services import tags as service
from ..dependencies import emachine, get_connection, require

router = APIRouter(prefix="/tags", tags=["tags"])
ERRORS = {404: {"model": Problem}, 409: {"model": Problem}, 422: {"model": Problem}, 502: {"model": Problem}}


@router.get("", response_model=TagList, summary="All tags, newest first")
def list_tags(conn: Connection = Depends(get_connection), client: EmachineClient = Depends(emachine),
              _: User = Depends(require(Permission.TAGS_READ))):
    return service.list_tags(conn, client)


@router.post("", response_model=TagDetail, status_code=status.HTTP_201_CREATED, responses=ERRORS, summary="Create a draft tag")
def create_tag(body: TagUpdate, conn: Connection = Depends(get_connection),
               user: User = Depends(require(Permission.TAGS_WRITE))):
    return service.create_tag(conn, body, user)


@router.get("/{tag_id}", response_model=TagDetail, responses=ERRORS, summary="One tag with its lines, issues, signature and files")
def get_tag(tag_id: str, conn: Connection = Depends(get_connection), client: EmachineClient = Depends(emachine),
            _: User = Depends(require(Permission.TAGS_READ))):
    return service.get_tag(conn, client, tag_id)


@router.put("/{tag_id}", response_model=TagDetail, responses=ERRORS,
            summary="Replace a tag's content (an eMachine tag is copied in first; the response carries its new id)")
def update_tag(tag_id: str, body: TagUpdate, conn: Connection = Depends(get_connection),
               client: EmachineClient = Depends(emachine), user: User = Depends(require(Permission.TAGS_WRITE))):
    return service.update_tag(conn, client, tag_id, body, user)


@router.post("/{tag_id}/submit", response_model=TagDetail, responses=ERRORS,
             summary="Sign in person (status Signed) or send for signature (status Submitted)")
def submit_tag(tag_id: str, body: SubmitRequest, conn: Connection = Depends(get_connection),
               client: EmachineClient = Depends(emachine), user: User = Depends(require(Permission.TAGS_SUBMIT))):
    return service.submit_tag(conn, client, tag_id, body, user)


@router.post("/{tag_id}/approve", response_model=TagDetail, responses=ERRORS, summary="Mark a submitted/signed tag Approved")
def approve_tag(tag_id: str, conn: Connection = Depends(get_connection), _: User = Depends(require(Permission.TAGS_DECIDE))):
    return service.set_status(conn, tag_id, TagStatus.APPROVED)


@router.post("/{tag_id}/reject", response_model=TagDetail, responses=ERRORS, summary="Send a tag back as Rejected (editable again)")
def reject_tag(tag_id: str, conn: Connection = Depends(get_connection), _: User = Depends(require(Permission.TAGS_DECIDE))):
    return service.set_status(conn, tag_id, TagStatus.REJECTED)


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT, responses=ERRORS, summary="Delete a draft or rejected tag")
def delete_tag(tag_id: str, background: BackgroundTasks, conn: Connection = Depends(get_connection),
               _: User = Depends(require(Permission.TAGS_DELETE))):
    for key in service.delete_tag(conn, tag_id):
        background.add_task(storage.remove, key)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
