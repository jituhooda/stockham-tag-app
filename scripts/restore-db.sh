#!/usr/bin/env bash
# Restore a backup made by backup-db.sh.   scripts/restore-db.sh backups/20261030T120000Z [--yes]
# Stop the API first when restoring PostgreSQL.
source "$(dirname "$0")/_common.sh"
[[ -n "${1:-}" ]] || die "Usage: restore-db.sh <backup dir> [--yes]"
dir="$(cd "$1" && pwd)"; shift
backend_py -m apexapp.database.backup restore "$dir" "$@"
"$ROOT/scripts/db-check.sh"
