# Database

The app stores tags and everything attached to them in **SQLite** (default,
zero setup) or **PostgreSQL** (recommended for production). The dialect is
chosen by `DATABASE_URL`; the code is the same for both.

| Folder | What's in it |
| --- | --- |
| `migrations/common` | Portable SQL applied on every database (reference data) |
| `migrations/sqlite`, `migrations/postgres` | Dialect-specific DDL |
| `schema/` | The full schema each database ends up with (generated, for review) |
| `seeds/` | Optional development data |
| `fixtures/emachine` | Sample eMachine responses for offline mode and tests |
| `portability/` | Type mappings, capability matrix, portability rules |
| `backup-restore/` | How backups work |

## Migrations

Files are named `NNNN_name.sql`. For each version the runner applies the
`common` file first, then the dialect file, inside one transaction, and records
the version and a checksum in `schema_migrations`.

```bash
scripts/db-migrate.sh            # apply pending migrations
scripts/db-migrate.sh --status   # show applied / pending
scripts/db-check.sh              # can we connect, and is the schema current?
scripts/db-verify.sh             # compare the live schema with data-model/model.json
```

The API also migrates on startup (`RUN_MIGRATIONS=true`, the default).

## Switching databases

`scripts/db-switch.sh postgres` copies all data from the current SQLite file
into an empty PostgreSQL database and prints the new `DATABASE_URL`. See
[docs/database-portability.md](../docs/database-portability.md).

## Tables

`tags`, `tag_labor`, `tag_materials`, `tag_equipment`, `tag_expenses`,
`tag_issues`, `tag_attachments`, `tag_signatures`, `approvers`,
`tag_statuses`, `schema_migrations`. Field-level documentation is in
[`data-model/`](../data-model).
