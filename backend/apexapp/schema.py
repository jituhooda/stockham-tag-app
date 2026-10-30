"""SQLAlchemy Core table definitions.

These mirror ``database/migrations`` (the migrations own the DDL; this module
is how the code queries those tables). ``tests/database-portability`` checks
that the two stay in step.
"""

from sqlalchemy import (
    BigInteger, Boolean, Column, Date, DateTime, ForeignKey, Integer, MetaData, Numeric,
    String, Table, Text, UniqueConstraint,
)

metadata = MetaData()

# BIGINT on Postgres, INTEGER (rowid alias) on SQLite.
Id = BigInteger().with_variant(Integer(), "sqlite")


def _fk_tag() -> Column:
    return Column("tag_id", Id, ForeignKey("tags.id", ondelete="CASCADE"), nullable=False, index=True)


tag_statuses = Table(
    "tag_statuses", metadata,
    Column("code", String(20), primary_key=True),
    Column("label", String(50), nullable=False),
    Column("editable", Boolean, nullable=False, default=False),
    Column("sort_order", Integer, nullable=False, default=0),
)

tags = Table(
    "tags", metadata,
    Column("id", Id, primary_key=True, autoincrement=True),
    Column("external_id", Id, unique=True),
    Column("tag_number", String(50), nullable=False),
    Column("status", String(20), ForeignKey("tag_statuses.code"), nullable=False, default="Draft"),
    Column("description", Text, nullable=False, default=""),
    Column("tag_date", Date),
    Column("is_premium", Boolean, nullable=False, default=False),
    Column("job_no", String(50), nullable=False, default=""),
    Column("job_name", String(255), nullable=False, default=""),
    Column("customer_id", String(50), nullable=False, default=""),
    Column("customer_name", String(255), nullable=False, default=""),
    Column("pm_email", String(255), nullable=False, default=""),
    Column("address", String(500), nullable=False, default=""),
    Column("created_by", String(100), nullable=False, default=""),
    Column("created_at", DateTime(timezone=True), nullable=False),
    Column("updated_at", DateTime(timezone=True), nullable=False),
    Column("submitted_at", DateTime(timezone=True)),
)

tag_labor = Table(
    "tag_labor", metadata,
    Column("id", Id, primary_key=True, autoincrement=True),
    _fk_tag(),
    Column("position", Integer, nullable=False, default=0),
    Column("employee_id", String(50), nullable=False, default=""),
    Column("employee_name", String(255), nullable=False, default=""),
    Column("trade", String(100), nullable=False, default=""),
    Column("regular_hours", Numeric(8, 2), nullable=False, default=0),
    Column("overtime_hours", Numeric(8, 2), nullable=False, default=0),
    Column("double_hours", Numeric(8, 2), nullable=False, default=0),
)

tag_materials = Table(
    "tag_materials", metadata,
    Column("id", Id, primary_key=True, autoincrement=True),
    _fk_tag(),
    Column("position", Integer, nullable=False, default=0),
    Column("description", String(255), nullable=False, default=""),
    Column("qty", Numeric(12, 2), nullable=False, default=0),
    Column("length", Numeric(12, 2)),
)

tag_equipment = Table(
    "tag_equipment", metadata,
    Column("id", Id, primary_key=True, autoincrement=True),
    _fk_tag(),
    Column("position", Integer, nullable=False, default=0),
    Column("description", String(255), nullable=False, default=""),
    Column("qty", Numeric(12, 2), nullable=False, default=0),
)

tag_expenses = Table(
    "tag_expenses", metadata,
    Column("id", Id, primary_key=True, autoincrement=True),
    _fk_tag(),
    Column("position", Integer, nullable=False, default=0),
    Column("description", String(255), nullable=False, default=""),
    Column("amount", Numeric(12, 2), nullable=False, default=0),
)

tag_issues = Table(
    "tag_issues", metadata,
    Column("id", Id, primary_key=True, autoincrement=True),
    _fk_tag(),
    Column("position", Integer, nullable=False, default=0),
    Column("text", String(1000), nullable=False),
)

tag_attachments = Table(
    "tag_attachments", metadata,
    Column("id", Id, primary_key=True, autoincrement=True),
    _fk_tag(),
    Column("file_name", String(255), nullable=False),
    Column("content_type", String(100), nullable=False),
    Column("size_bytes", Integer, nullable=False),
    Column("storage_key", String(100), nullable=False, unique=True),
    Column("uploaded_by", String(100), nullable=False, default=""),
    Column("created_at", DateTime(timezone=True), nullable=False),
)

tag_signatures = Table(
    "tag_signatures", metadata,
    Column("tag_id", Id, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
    Column("approver", String(255), nullable=False, default=""),
    Column("mode", String(20), nullable=False, default="in-person"),
    Column("email", String(255), nullable=False, default=""),
    Column("image_png", Text, nullable=False, default=""),
    Column("signed_at", DateTime(timezone=True)),
)

approvers = Table(
    "approvers", metadata,
    Column("id", Id, primary_key=True, autoincrement=True),
    Column("customer", String(255), nullable=False),
    Column("name", String(255), nullable=False),
    Column("email", String(255), nullable=False, default=""),
    Column("created_at", DateTime(timezone=True), nullable=False),
    UniqueConstraint("customer", "name"),
)

LINE_TABLES = {
    "labor": tag_labor,
    "materials": tag_materials,
    "equipment": tag_equipment,
    "expenses": tag_expenses,
}
