#!/usr/bin/env bash
# Move all data to another database.
#   scripts/db-switch.sh postgres postgresql+psycopg://user:pass@host:5432/db
#   scripts/db-switch.sh sqlite   sqlite:////abs/path/new.db
# Copies from the current DATABASE_URL (default SQLite file) into the target,
# which must be empty, then tells you what to set DATABASE_URL to.
source "$(dirname "$0")/_common.sh"

target_kind="${1:-}"; target_url="${2:-}"
[[ "$target_kind" =~ ^(postgres|sqlite)$ && -n "$target_url" ]] || die "Usage: db-switch.sh postgres|sqlite <target DATABASE_URL>"
[[ "$target_kind" == postgres && "$target_url" != postgres* ]] && die "Target URL must start with postgresql://"
[[ "$target_kind" == sqlite && "$target_url" != sqlite* ]] && die "Target URL must start with sqlite://"

info "Backing up the current database first"
backend_py -m apexapp.database.backup create --out "$ROOT/backups"
info "Copying data"
backend_py -m apexapp.database.transfer --to "$target_url"
DATABASE_URL="$target_url" backend_py -m apexapp.database.check --verify
ok "Done. Set DATABASE_URL=$target_url (backend/.env or your deployment) and restart the API."
