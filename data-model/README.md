# Data model

The canonical, database-independent description of what the app stores.
`model.json` is the whole model in one file; the folders hold the same
definitions one per file for review and tooling:

| Folder | Contents |
| --- | --- |
| `entities/` | One file per table: logical field types, nullability, defaults, descriptions |
| `relationships/` | Foreign keys, cardinality and delete behaviour |
| `constraints/` | Unique and check constraints |
| `indexes/` | Secondary indexes |
| `enums/` | Value sets (tag status, signature mode, roles) |

## Entities

```
TagStatus 1 ──< Tag 1 ──< LaborLine
                    ├──< MaterialLine
                    ├──< EquipmentLine
                    ├──< ExpenseLine
                    ├──< TagIssue
                    ├──< Attachment        (bytes in file storage)
                    └──1 Signature
Approver           (per customer, independent of tags)
```

Deleting a tag cascades to all of its children.

## Logical types

| Logical | SQLite | PostgreSQL |
| --- | --- | --- |
| `id` | `INTEGER` | `BIGINT` (identity) |
| `string(n)` | `VARCHAR(n)` | `VARCHAR(n)` |
| `text` | `TEXT` | `TEXT` |
| `decimal(p,s)` | `NUMERIC(p,s)` | `NUMERIC(p,s)` |
| `boolean` | `BOOLEAN` (0/1) | `BOOLEAN` |
| `date` | `DATE` | `DATE` |
| `timestamp` | `TIMESTAMP` (UTC) | `TIMESTAMPTZ` |

The full mapping and the differences that matter are in
[`database/portability`](../database/portability).

## What is *not* in this model

Employees, jobs, materials, equipment, expense types and labor trades are
reference data owned by eMachine. The app reads them through the backend
(`/api/v1/master/*`) and stores only the chosen values on each line (for
example `employee_id` and `employee_name`), so a tag stays readable even if the
reference data changes later.

## Keeping it in step

The physical schema is defined by `database/migrations`. When you change a
migration, update this model too; `tests/database-portability` fails when a
table or column exists in one and not the other.
