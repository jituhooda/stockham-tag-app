"""Minimal Prometheus metrics, exposed at /metrics."""

from __future__ import annotations

import threading
import time
from collections import defaultdict

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import PlainTextResponse

_lock = threading.Lock()
_requests: dict[tuple[str, str, int], int] = defaultdict(int)
_duration_sum: dict[tuple[str, str], float] = defaultdict(float)
_duration_count: dict[tuple[str, str], int] = defaultdict(int)


def _route_template(request) -> str:
    """The matched route's template (``/api/v1/tags/{tag_id}``), so ids don't explode label cardinality."""
    if request.scope.get("route") is None:
        return "unmatched"
    path = request.url.path
    for name, value in request.scope.get("path_params", {}).items():
        path = path.replace(f"/{value}", f"/{{{name}}}", 1)
    return path


class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        if request.url.path != "/metrics":
            route = _route_template(request)
            with _lock:
                _requests[(request.method, route, response.status_code)] += 1
                _duration_sum[(request.method, route)] += time.perf_counter() - start
                _duration_count[(request.method, route)] += 1
        return response


def render_metrics() -> PlainTextResponse:
    lines = [
        "# HELP stockham_http_requests_total HTTP requests by method, route and status.",
        "# TYPE stockham_http_requests_total counter",
    ]
    with _lock:
        for (method, route, code), n in sorted(_requests.items()):
            lines.append(f'stockham_http_requests_total{{method="{method}",route="{route}",status="{code}"}} {n}')
        lines += [
            "# HELP stockham_http_request_duration_seconds Request duration.",
            "# TYPE stockham_http_request_duration_seconds summary",
        ]
        for (method, route), total in sorted(_duration_sum.items()):
            labels = f'method="{method}",route="{route}"'
            lines.append(f"stockham_http_request_duration_seconds_sum{{{labels}}} {total:.6f}")
            lines.append(f"stockham_http_request_duration_seconds_count{{{labels}}} {_duration_count[(method, route)]}")
    return PlainTextResponse("\n".join(lines) + "\n", media_type="text/plain; version=0.0.4")
