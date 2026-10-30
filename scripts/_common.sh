# Shared helpers for scripts/*.sh (sourced, not executed).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ROOT/.run"

# Load .env without overriding variables already set in the shell.
if [[ -f "$ROOT/.env" ]]; then
  while IFS='=' read -r key value; do
    [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue
    key="${key//[[:space:]]/}"
    [[ -z "${!key:-}" ]] && export "$key=$value"
  done < "$ROOT/.env"
fi

info()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
ok()    { printf '\033[1;32m ✓\033[0m %s\n' "$*"; }
warn()  { printf '\033[1;33m !\033[0m %s\n' "$*" >&2; }
die()   { printf '\033[1;31m ✗\033[0m %s\n' "$*" >&2; exit 1; }
need()  { command -v "$1" >/dev/null 2>&1 || die "$1 is required but not installed"; }

# Run a backend Python module with the project's environment.
backend_py() {
  need uv
  (cd "$ROOT/backend" && uv run --quiet python "$@")
}

compose() {
  need docker
  docker compose -f "$ROOT/docker-compose.yml" "$@"
}
