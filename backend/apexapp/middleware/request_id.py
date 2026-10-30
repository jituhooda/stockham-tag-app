from __future__ import annotations

import contextvars
import re
import uuid

from starlette.middleware.base import BaseHTTPMiddleware

_request_id: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="")
_SAFE = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


def current_request_id() -> str:
    return _request_id.get()


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        incoming = request.headers.get("X-Request-ID", "")
        rid = incoming if _SAFE.match(incoming) else uuid.uuid4().hex
        token = _request_id.set(rid)
        try:
            response = await call_next(request)
        finally:
            _request_id.reset(token)
        response.headers["X-Request-ID"] = rid
        return response
