"""Request authentication.

``authMode: none`` - every request acts as one local user with ``defaultRole``
(development, or when a reverse proxy in front already authenticates).
``authMode: token`` - clients send ``Authorization: Bearer <token>``; tokens and
their roles come from the ``AUTH_TOKENS`` environment variable.
"""

from __future__ import annotations

import hmac

from fastapi import HTTPException, Request, status

from .config import Settings, User


def authenticate(request: Request, settings: Settings) -> User:
    if settings.auth_mode == "none":
        return User(name=request.headers.get("X-User-Name", "local user")[:100] or "local user", role=settings.default_role)

    header = request.headers.get("Authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in required", headers={"WWW-Authenticate": "Bearer"})
    for known, user in settings.auth_tokens.items():
        if hmac.compare_digest(known.encode(), token.strip().encode()):
            return user
    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid access token", headers={"WWW-Authenticate": "Bearer"})
