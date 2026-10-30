from __future__ import annotations

from collections.abc import Callable

from fastapi import Depends, HTTPException, Request, status

from ..auth import authenticate
from ..config import Settings, User, get_settings
from ..database.session import get_connection
from ..integrations.emachine import EmachineClient, get_emachine
from ..rbac import Permission, has_permission

__all__ = ["current_user", "require", "get_connection", "emachine", "settings"]


def settings() -> Settings:
    return get_settings()


def emachine() -> EmachineClient:
    return get_emachine()


def current_user(request: Request, s: Settings = Depends(settings)) -> User:
    return authenticate(request, s)


def require(permission: Permission) -> Callable[..., User]:
    def dep(user: User = Depends(current_user)) -> User:
        if not has_permission(user.role, permission):
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"Your role ({user.role}) can't do this")
        return user

    return dep
