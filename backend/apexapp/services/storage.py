"""Attachment file storage on the local filesystem (a mounted volume in Docker)."""

from __future__ import annotations

import secrets
from pathlib import Path

from ..config import get_settings


def _root() -> Path:
    root = get_settings().attachments_dir
    root.mkdir(parents=True, exist_ok=True)
    return root


def new_key() -> str:
    return secrets.token_hex(16)


def path_for(key: str) -> Path:
    if not key.isalnum():  # keys are generated hex; refuse anything path-like
        raise ValueError("bad storage key")
    return _root() / key[:2] / key


def write(key: str, data: bytes) -> None:
    p = path_for(key)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(data)


def remove(key: str) -> None:
    path_for(key).unlink(missing_ok=True)


def all_keys() -> set[str]:
    return {p.name for p in _root().glob("*/*") if p.is_file()}
