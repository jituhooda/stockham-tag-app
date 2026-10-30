from fastapi import APIRouter

from . import approvers, attachments, health, master, meta, tags

api_router = APIRouter(prefix="/api/v1")
for module in (meta, master, tags, attachments, approvers):
    api_router.include_router(module.router)

__all__ = ["api_router", "health"]
