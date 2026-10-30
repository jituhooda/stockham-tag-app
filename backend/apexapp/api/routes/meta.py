from __future__ import annotations

from fastapi import APIRouter, Depends

from ...config import Settings, User
from ...rbac import permissions_for
from ...schemas import Me
from ..dependencies import current_user, settings

router = APIRouter(tags=["meta"])


@router.get("/config", summary="Public app configuration (branding, features)")
def public_config(s: Settings = Depends(settings)) -> dict:
    return s.public()


@router.get("/me", response_model=Me, summary="The signed-in user and their permissions")
def me(user: User = Depends(current_user)) -> Me:
    return Me(name=user.name, role=user.role, permissions=sorted(p.value for p in permissions_for(user.role)))
