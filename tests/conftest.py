"""Shared fixtures for the cross-cutting suites. Run from backend/:

    uv run pytest ../tests                       # SQLite only
    TEST_POSTGRES_URL=postgresql+psycopg://… uv run pytest ../tests
"""

import os
from pathlib import Path

import pytest

from apexapp.utils.testing import app_client

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture
def client(tmp_path):
    with app_client(tmp_path) as c:
        yield c


@pytest.fixture
def make_client(tmp_path):
    """Build a client with extra environment, e.g. make_client(AUTH_MODE='token')."""
    def factory(**env):
        return app_client(tmp_path, **env)
    return factory


@pytest.fixture
def postgres_url():
    url = os.environ.get("TEST_POSTGRES_URL")
    if not url:
        pytest.skip("TEST_POSTGRES_URL not set")
    return url
