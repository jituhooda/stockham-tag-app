-- 0001 initial schema (SQLite)

CREATE TABLE tag_statuses (
    code        VARCHAR(20) PRIMARY KEY,
    label       VARCHAR(50) NOT NULL,
    editable    BOOLEAN NOT NULL DEFAULT 0,
    sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE tags (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    external_id    INTEGER UNIQUE,
    tag_number     VARCHAR(50) NOT NULL,
    status         VARCHAR(20) NOT NULL DEFAULT 'Draft' REFERENCES tag_statuses (code),
    description    TEXT NOT NULL DEFAULT '',
    tag_date       DATE,
    is_premium     BOOLEAN NOT NULL DEFAULT 0,
    job_no         VARCHAR(50) NOT NULL DEFAULT '',
    job_name       VARCHAR(255) NOT NULL DEFAULT '',
    customer_id    VARCHAR(50) NOT NULL DEFAULT '',
    customer_name  VARCHAR(255) NOT NULL DEFAULT '',
    pm_email       VARCHAR(255) NOT NULL DEFAULT '',
    address        VARCHAR(500) NOT NULL DEFAULT '',
    created_by     VARCHAR(100) NOT NULL DEFAULT '',
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at   TIMESTAMP
);
CREATE INDEX ix_tags_updated_at ON tags (updated_at);
CREATE INDEX ix_tags_status ON tags (status);
CREATE INDEX ix_tags_job_no ON tags (job_no);

CREATE TABLE tag_labor (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    tag_id         INTEGER NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    position       INTEGER NOT NULL DEFAULT 0,
    employee_id    VARCHAR(50) NOT NULL DEFAULT '',
    employee_name  VARCHAR(255) NOT NULL DEFAULT '',
    trade          VARCHAR(100) NOT NULL DEFAULT '',
    regular_hours  NUMERIC(8, 2) NOT NULL DEFAULT 0 CHECK (regular_hours >= 0),
    overtime_hours NUMERIC(8, 2) NOT NULL DEFAULT 0 CHECK (overtime_hours >= 0),
    double_hours   NUMERIC(8, 2) NOT NULL DEFAULT 0 CHECK (double_hours >= 0)
);
CREATE INDEX ix_tag_labor_tag_id ON tag_labor (tag_id);

CREATE TABLE tag_materials (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    tag_id      INTEGER NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    position    INTEGER NOT NULL DEFAULT 0,
    description VARCHAR(255) NOT NULL DEFAULT '',
    qty         NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (qty >= 0),
    length      NUMERIC(12, 2) CHECK (length >= 0)
);
CREATE INDEX ix_tag_materials_tag_id ON tag_materials (tag_id);

CREATE TABLE tag_equipment (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    tag_id      INTEGER NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    position    INTEGER NOT NULL DEFAULT 0,
    description VARCHAR(255) NOT NULL DEFAULT '',
    qty         NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (qty >= 0)
);
CREATE INDEX ix_tag_equipment_tag_id ON tag_equipment (tag_id);

CREATE TABLE tag_expenses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    tag_id      INTEGER NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    position    INTEGER NOT NULL DEFAULT 0,
    description VARCHAR(255) NOT NULL DEFAULT '',
    amount      NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0)
);
CREATE INDEX ix_tag_expenses_tag_id ON tag_expenses (tag_id);

CREATE TABLE tag_issues (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    tag_id    INTEGER NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    position  INTEGER NOT NULL DEFAULT 0,
    text      VARCHAR(1000) NOT NULL
);
CREATE INDEX ix_tag_issues_tag_id ON tag_issues (tag_id);

CREATE TABLE tag_attachments (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    tag_id        INTEGER NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    file_name     VARCHAR(255) NOT NULL,
    content_type  VARCHAR(100) NOT NULL,
    size_bytes    INTEGER NOT NULL CHECK (size_bytes >= 0),
    storage_key   VARCHAR(100) NOT NULL UNIQUE,
    uploaded_by   VARCHAR(100) NOT NULL DEFAULT '',
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_tag_attachments_tag_id ON tag_attachments (tag_id);

CREATE TABLE tag_signatures (
    tag_id     INTEGER PRIMARY KEY REFERENCES tags (id) ON DELETE CASCADE,
    approver   VARCHAR(255) NOT NULL DEFAULT '',
    mode       VARCHAR(20) NOT NULL DEFAULT 'in-person' CHECK (mode IN ('in-person', 'send')),
    email      VARCHAR(255) NOT NULL DEFAULT '',
    image_png  TEXT NOT NULL DEFAULT '',
    signed_at  TIMESTAMP
);

CREATE TABLE approvers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    customer    VARCHAR(255) NOT NULL,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL DEFAULT '',
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (customer, name)
);
