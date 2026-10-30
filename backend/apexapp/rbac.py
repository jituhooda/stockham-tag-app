"""Roles and the permissions each one grants."""

from __future__ import annotations

from enum import Enum


class Permission(str, Enum):
    TAGS_READ = "tags:read"
    TAGS_WRITE = "tags:write"
    TAGS_SUBMIT = "tags:submit"
    TAGS_DECIDE = "tags:decide"   # approve / reject
    TAGS_DELETE = "tags:delete"
    MASTER_READ = "master:read"
    APPROVERS_WRITE = "approvers:write"
    ADMIN = "admin"


_VIEWER = {Permission.TAGS_READ, Permission.MASTER_READ}
_EDITOR = _VIEWER | {Permission.TAGS_WRITE, Permission.TAGS_SUBMIT, Permission.TAGS_DELETE, Permission.APPROVERS_WRITE}
_APPROVER = _EDITOR | {Permission.TAGS_DECIDE}

ROLES: dict[str, set[Permission]] = {
    "viewer": _VIEWER,
    "editor": _EDITOR,
    "approver": _APPROVER,
    "admin": set(Permission),
}


def permissions_for(role: str) -> set[Permission]:
    return ROLES.get(role, set())


def has_permission(role: str, permission: Permission) -> bool:
    return permission in permissions_for(role)
