# Backend migrations

The SQL migrations themselves live in [`../../database/migrations`](../../database/migrations)
so that DBAs, the backend and the portability tests all read the same files.
This folder documents how the backend applies them.

```bash
uv run python -m apexapp.database.migrate --status   # list applied / pending
uv run python -m apexapp.database.migrate            # apply pending
```

The API also applies pending migrations on startup unless `RUN_MIGRATIONS=false`.

To add a migration, create `NNNN_short_name.sql` with the next number in
`database/migrations/common/` (portable SQL) and/or in both
`database/migrations/sqlite/` and `database/migrations/postgres/`
(dialect-specific SQL). Never edit a migration that has shipped: the runner
records a checksum and logs a warning when an applied file changes.
