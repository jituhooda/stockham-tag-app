"""Turn eMachine rows into this app's shapes, tolerating varying column names."""

from __future__ import annotations

from typing import Any

from ..utils.fields import id_of, iso_date, label_of, number, pick, text, truthy

Row = dict[str, Any]


def employee(r: Row) -> dict:
    return {
        "id": text(r, "Id", "id") or text(r, "Employee"),
        "employee": text(r, "Employee"),
        "name": text(r, "EmployeeName") or text(r, "Employee"),
        "division": text(r, "Division"),
    }


def master_item(r: Row) -> dict:
    amount = pick(r, "Amount", "amount", "Rate", "rate", "Cost", "cost", "Price", "price", "DefaultAmount")
    try:
        default = float(amount) if amount is not None else None
    except (TypeError, ValueError):
        default = None
    return {"id": id_of(r), "label": label_of(r), "defaultAmount": default}


TRADE_FIELDS = ("Trade", "trade", "TradeName", "trade_name", "Classification", "Craft", "LaborType", "labor_type")


def trade(r: Row) -> str:
    return text(r, *TRADE_FIELDS) or label_of(r)


def job(r: Row) -> dict:
    job_no, job_name = text(r, "JobNo"), text(r, "JobName")
    return {
        "jobNo": job_no,
        "jobName": job_name,
        "label": text(r, "CJobName") or f"{job_no} : {job_name}",
        "customerId": text(r, "CustomerID", "CustomerId", "Customer_ID"),
        "customerName": text(r, "CustomerName"),
        "address": text(r, "Address", "JobAddress"),
        "pmEmail": text(r, "PMEmail", "PM_Email", "PmEmail", "ProjectManagerEmail"),
    }


def tag_header(r: Row) -> dict:
    return {
        "external_id": int(number(r, "Id", "id")),
        "tag_number": text(r, "tag_number", "TagNumber"),
        "status": text(r, "status", "Status") or "Draft",
        "description": text(r, "description", "Description"),
        "tag_date": iso_date(pick(r, "tag_date", "TagDate")),
        "is_premium": truthy(pick(r, "IsPremium")),
        "job_no": text(r, "JobNo"),
        "job_name": text(r, "JobName"),
        "customer_id": text(r, "CustomerID", "CustomerId"),
        "customer_name": text(r, "CustomerName"),
        "pm_email": text(r, "PMEmail"),
        "address": text(r, "Address", "JobAddress"),
        "updated": iso_date(pick(r, "LastModifiedDate")),
        "counts": {
            "labor": int(number(r, "labor_count")),
            "material": int(number(r, "material_count")),
            "equipment": int(number(r, "equipment_count")),
            "expense": int(number(r, "expense_count")),
        },
    }


def labor_line(r: Row) -> dict:
    return {
        "employeeId": text(r, "employee_id", "EmployeeId", "Employee", "employee"),
        "employeeName": text(r, "EmployeeName", "employee_name", "resource", "Resource", "Employee", "employee"),
        "trade": text(r, "trade", "Trade"),
        "regular": number(r, "regular", "Regular", "regular_hours", "RegularHours", "rt", "RT"),
        "overtime": number(r, "overtime", "Overtime", "overtime_hours", "OvertimeHours", "ot", "OT"),
        "doubleTime": number(r, "doubletime", "DoubleTime", "double_time", "doubletime_hours", "DoubleTimeHours", "dt", "DT"),
    }


def material_line(r: Row) -> dict:
    length = pick(r, "length", "Length")
    return {
        "description": text(r, "description", "Description", "material", "Material", "name", "Name"),
        "qty": number(r, "qty", "Qty", "quantity", "Quantity"),
        "length": float(length) if length is not None and str(length).strip() != "" else None,
    }


def equipment_line(r: Row) -> dict:
    return {
        "description": text(r, "description", "Description", "equipment", "Equipment", "name", "Name"),
        "qty": number(r, "qty", "Qty", "quantity", "Quantity"),
    }


def expense_line(r: Row) -> dict:
    return {
        "description": text(r, "description", "Description", "expense", "Expense", "expense_type", "name", "Name"),
        "amount": number(r, "amount", "Amount", "cost", "Cost", "value"),
    }
