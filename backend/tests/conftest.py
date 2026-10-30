import pytest

from apexapp.utils.testing import app_client


@pytest.fixture
def client(tmp_path):
    with app_client(tmp_path) as c:
        yield c
