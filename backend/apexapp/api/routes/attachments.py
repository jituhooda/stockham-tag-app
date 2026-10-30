from __future__ import annotations

from urllib.parse import quote

from fastapi import APIRouter, BackgroundTasks, Depends, File, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import Connection

from ...config import Settings, User
from ...integrations.emachine import EmachineClient
from ...rbac import Permission
from ...schemas import Attachment, Problem
from ...services import attachments as service
from ...services import storage
from ...services import tags as tag_service
from ...services.errors import Invalid, NotFound
from ..dependencies import emachine, get_connection, require, settings

router = APIRouter(tags=["attachments"])
ERRORS = {404: {"model": Problem}, 409: {"model": Problem}, 422: {"model": Problem}}
INLINE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"}


@router.post("/tags/{tag_id}/attachments", response_model=Attachment, status_code=status.HTTP_201_CREATED,
             responses=ERRORS, summary="Upload a photo or document")
async def upload(tag_id: str, file: UploadFile = File(...), conn: Connection = Depends(get_connection),
                 client: EmachineClient = Depends(emachine), s: Settings = Depends(settings),
                 user: User = Depends(require(Permission.TAGS_WRITE))):
    data = await file.read(s.upload_max_bytes + 1)
    if len(data) > s.upload_max_bytes:
        raise Invalid(f"Files must be {s.upload_max_bytes // (1024 * 1024)} MB or smaller")
    local_id = tag_service.ensure_local(conn, client, tag_id, user)
    return service.add(conn, local_id, file.filename or "file", file.content_type or "", data, user)


@router.get("/attachments/{attachment_id}", responses=ERRORS, summary="Download an attachment")
def download(attachment_id: int, conn: Connection = Depends(get_connection),
             _: User = Depends(require(Permission.TAGS_READ))):
    a = service.get(conn, attachment_id)
    disposition = "inline" if a["content_type"] in INLINE_TYPES else "attachment"
    return FileResponse(
        storage.path_for(a["storage_key"]),
        media_type=a["content_type"],
        headers={
            "Content-Disposition": f"{disposition}; filename*=UTF-8''{quote(a['file_name'])}",
            "Cache-Control": "private, max-age=3600",
        },
    )


@router.delete("/tags/{tag_id}/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT,
               responses=ERRORS, summary="Delete an attachment")
def remove(tag_id: str, attachment_id: int, background: BackgroundTasks, conn: Connection = Depends(get_connection),
           _: User = Depends(require(Permission.TAGS_WRITE))):
    ref = tag_service.ref_or_404(tag_id)
    if ref.local_id is None:
        raise NotFound("Attachment not found")
    key = service.remove(conn, ref.local_id, attachment_id)
    background.add_task(storage.remove, key)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
