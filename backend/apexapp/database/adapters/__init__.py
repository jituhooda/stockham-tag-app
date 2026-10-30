"""Per-dialect engine setup. Each adapter exposes ``matches(url)`` and ``create(url, cfg)``."""

from . import postgres, sqlite

ADAPTERS = (sqlite, postgres)


def adapter_for(url: str):
    for adapter in ADAPTERS:
        if adapter.matches(url):
            return adapter
    raise ValueError(f"Unsupported database URL: {url.split(':', 1)[0]}")
