"""Reference data (employees, jobs, materials …) served from eMachine."""

from __future__ import annotations

from ..config import get_settings
from ..integrations import emachine_mapping as m
from ..integrations.emachine import EmachineClient, EmachineError, sql_literal
from .errors import Invalid, UpstreamUnavailable

KINDS = ("employees", "materials", "equipment", "expenses", "trades")


def _run(client: EmachineClient, name: str, **params: str) -> list[dict]:
    try:
        return client.run(name, **params)
    except EmachineError as e:
        raise UpstreamUnavailable(str(e)) from e


def _unique(items: list[dict], key: str = "label") -> list[dict]:
    seen: set[str] = set()
    out = []
    for it in items:
        k = str(it.get(key, "")).strip().lower()
        if k and k not in seen:
            seen.add(k)
            out.append(it)
    return sorted(out, key=lambda it: str(it[key]).lower())


def employees(client: EmachineClient) -> list[dict]:
    return sorted((m.employee(r) for r in _run(client, "employees")), key=lambda e: e["name"].lower())


def items(client: EmachineClient, kind: str) -> list[dict]:
    if kind not in ("materials", "equipment", "expenses"):
        raise Invalid(f"Unknown list '{kind}'")
    return _unique([m.master_item(r) for r in _run(client, kind)])


def trades(client: EmachineClient) -> list[dict]:
    return _unique([{"label": m.trade(r)} for r in _run(client, "laborRates")])


def jobs(client: EmachineClient, divisions: list[str]) -> list[dict]:
    divisions = [d.strip() for d in divisions if d.strip()] or list(get_settings().app.get("defaultDivisions", ["DFH"]))
    if len(divisions) > 20 or any(len(d) > 50 for d in divisions):
        raise Invalid("Too many or too long division names")
    rows = _run(client, "jobs", divisions=",".join(sql_literal(d) for d in divisions))
    return [m.job(r) for r in rows]


def division(client: EmachineClient, employee: str) -> dict:
    employee = employee.strip()
    if not employee or len(employee) > 100:
        raise Invalid("Employee is required")
    rows = _run(client, "division", employee=sql_literal(employee))
    found = sorted({str(r.get("Division") or r.get("division") or "").strip() for r in rows} - {""})
    return {"employee": employee, "divisions": found or list(get_settings().app.get("defaultDivisions", ["DFH"]))}


def issues(client: EmachineClient) -> list[dict]:
    query = get_settings().features.get("issuesQuery") or ""
    if not query:
        return []
    from ..utils.fields import label_of, text

    try:
        rows = client.run_sql(query)
    except EmachineError as e:
        raise UpstreamUnavailable(str(e)) from e
    out = []
    for r in rows:
        num = text(r, "IssueNo", "issue_number", "IssueNumber", "Number", "Id", "id")
        body = text(r, "Description", "description", "Issue", "issue", "Title", "title") or label_of(r)
        out.append({"label": f"{num} : {body}" if num and num != body else body})
    return out
