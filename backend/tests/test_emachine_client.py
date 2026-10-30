import base64
import json

import httpx
import pytest

from apexapp.config import load_settings
from apexapp.integrations.emachine import EmachineClient, EmachineError, encode_query, extract_rows, sql_literal


def test_encode_query_matches_documented_example():
    assert encode_query("select * from materials_master") == "c2VsZWN0ICogZnJvbSBtYXRlcmlhbHNfbWFzdGVy"


def test_sql_literal_escapes_quotes_and_backslashes():
    assert sql_literal("O'Brien") == "'O''Brien'"
    assert sql_literal("a\\' OR 1=1 --") == "'a\\\\'' OR 1=1 --'"


@pytest.mark.parametrize("body", [[{"a": 1}], {"data": [{"a": 1}]}, {"result": {"rows": [{"a": 1}]}}])
def test_extract_rows_handles_envelopes(body):
    assert extract_rows(body) == [{"a": 1}]


def _client(handler, monkeypatch, **env):
    monkeypatch.setenv("EMACHINE_MODE", "live")
    monkeypatch.setenv("EMACHINE_API_TOKEN", "secret-token")
    monkeypatch.setenv("EMACHINE_CACHE_TTL", env.get("ttl", "0"))
    return EmachineClient(load_settings(), transport=httpx.MockTransport(handler))


def test_live_request_is_base64_and_authenticated(monkeypatch):
    seen = {}

    def handler(request: httpx.Request):
        seen["query"] = base64.b64decode(request.url.params["query"]).decode()
        seen["auth"] = request.headers["Authorization"]
        return httpx.Response(200, json=[{"Id": 1, "Description": "wood door"}])

    rows = _client(handler, monkeypatch).run("materials")
    assert rows == [{"Id": 1, "Description": "wood door"}]
    assert seen == {"query": "select * from materials_master", "auth": "Bearer secret-token"}


def test_division_query_quotes_employee(monkeypatch):
    seen = {}

    def handler(request):
        seen["q"] = base64.b64decode(request.url.params["query"]).decode()
        return httpx.Response(200, json=[])

    _client(handler, monkeypatch).run("division", employee=sql_literal("Sean"))
    assert seen["q"] == "select Division from employees where EMPLOYEE = 'Sean'"


def test_http_errors_become_emachine_errors(monkeypatch):
    with pytest.raises(EmachineError, match="HTTP 500"):
        _client(lambda r: httpx.Response(500), monkeypatch).run("materials")
    with pytest.raises(EmachineError, match="non-JSON"):
        _client(lambda r: httpx.Response(200, text="<html>"), monkeypatch).run("materials")


def test_results_are_cached(monkeypatch):
    calls = []

    def handler(request):
        calls.append(1)
        return httpx.Response(200, content=json.dumps([{"x": 1}]))

    c = _client(handler, monkeypatch, ttl="60")
    c.run("materials")
    c.run("materials")
    assert len(calls) == 1
