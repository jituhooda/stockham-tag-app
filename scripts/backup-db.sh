#!/usr/bin/env bash
# Back up the database and attachments to backups/<UTC timestamp>/  (--out DIR to change)
source "$(dirname "$0")/_common.sh"
out="$ROOT/backups"
[[ "${1:-}" == "--out" ]] && out="$(realpath -m "$2")"
backend_py -m apexapp.database.backup create --out "$out"
