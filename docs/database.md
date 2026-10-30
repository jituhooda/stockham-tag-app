# Database

See also [database/README.md](../database/README.md) and the field-level
model in [data-model/](../data-model).

## Choosing a database

| | SQLite | PostgreSQL |
| --- | --- | --- |
| Setup | none (a file in `data/`) | a server or managed service |
| Good for | development, a single site, < ~20 concurrent users | production, several API replicas |
| Writers | one at a time (WAL mode, 5 s busy timeout) | concurrent |
| Backups | file copy via SQLite backup API | `pg_dump` |

Set `DATABASE_URL`:

```
sqlite:////absolute/path/stockham-tags.db
postgresql+psycopg://user:password@host:5432/stockham_tags
```

## Migrations

`database/migrations/{common,sqlite,postgres}/NNNN_name.sql`, applied in
version order (common first) by `apexapp.database.migrate`, on API startup or
with `scripts/db-migrate.sh`. Applied versions and checksums are kept in
`schema_migrations`.

## What is stored where

- Tag header, lines, issues, signature, approvers → database.
- Attachment bytes → `ATTACHMENTS_DIR` (a volume), keyed by random 32-hex names;
  the `tag_attachments` row holds the name, type and size.
- Reference data → eMachine (cached in memory for `cacheTtlSeconds`).

Signatures are stored as PNG data URLs (typically 5–30 KB, capped by
`maxSignatureBytes`).

## Operations

```bash
scripts/db-check.sh          # connect + pending migrations
scripts/db-verify.sh         # live schema vs data model
scripts/backup-db.sh         # database + attachments
scripts/restore-db.sh <dir>
scripts/db-switch.sh postgres <url>
```
