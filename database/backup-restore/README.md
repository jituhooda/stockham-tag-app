# Backup and restore

A complete backup is **the database plus the attachments directory** (file
bytes are stored outside the database; rows hold their storage keys).

```bash
scripts/backup-db.sh                      # writes backups/<timestamp>/{db.*, attachments.tar.gz, manifest.json}
scripts/restore-db.sh backups/20261030T120000Z
```

| Database | Backup | Restore |
| --- | --- | --- |
| SQLite | `sqlite3 <file> ".backup db.sqlite3"` (consistent while the app runs) | stop the API, copy the file back |
| PostgreSQL | `pg_dump -Fc` | `pg_restore --clean --if-exists` |

Both scripts read `DATABASE_URL` and `ATTACHMENTS_DIR` from the environment or
`.env`. Restores ask for confirmation unless `--yes` is passed.

## Recommendations

- Run the backup daily (cron or a Kubernetes CronJob) and keep at least 14 days.
- Copy backups off the host (object storage).
- Test a restore into a scratch database every quarter:
  `DATABASE_URL=postgresql+psycopg://…/restore_test scripts/restore-db.sh --yes <dir>`,
  then `scripts/db-verify.sh`.
