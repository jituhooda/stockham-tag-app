#!/usr/bin/env bash
# Start the app.
#   scripts/start.sh               local dev servers: API :8000, web :5173
#   scripts/start.sh --fixtures    same, with offline sample data instead of eMachine
#   scripts/start.sh --docker      docker compose (web on :8080)
#   scripts/start.sh --docker-prod docker compose with PostgreSQL
source "$(dirname "$0")/_common.sh"

mode="local"
for arg in "$@"; do
  case "$arg" in
    --fixtures) export EMACHINE_MODE=fixtures ;;
    --docker) mode="docker" ;;
    --docker-prod) mode="docker-prod" ;;
    -h|--help) sed -n '2,6p' "$0"; exit 0 ;;
    *) die "Unknown option $arg" ;;
  esac
done

case "$mode" in
  docker) compose up -d --build; ok "Web app: http://localhost:${WEB_PORT:-8080}" ;;
  docker-prod) compose -f "$ROOT/docker-compose.prod.yml" up -d --build; ok "Web app: http://localhost:${WEB_PORT:-8080}" ;;
  local)
    mkdir -p "$RUN_DIR"
    [[ -f "$RUN_DIR/api.pid" ]] && kill -0 "$(cat "$RUN_DIR/api.pid")" 2>/dev/null && die "Already running; use scripts/stop.sh"
    info "Starting API on :8000 (eMachine: ${EMACHINE_MODE:-live})"
    (cd "$ROOT/backend" && set -a && { [[ -f .env ]] && source .env || true; } && set +a && \
      EMACHINE_MODE="${EMACHINE_MODE:-live}" nohup uv run uvicorn apexapp.main:app --reload --port 8000 \
      > "$RUN_DIR/api.log" 2>&1 & echo $! > "$RUN_DIR/api.pid")
    info "Starting web app on :5173"
    (cd "$ROOT/frontend" && nohup npm run dev > "$RUN_DIR/web.log" 2>&1 & echo $! > "$RUN_DIR/web.pid")
    "$ROOT/scripts/health-check.sh" --wait 60 >/dev/null && ok "API healthy" || warn "API not healthy yet; see .run/api.log"
    ok "Web app: http://localhost:5173   API docs: http://localhost:8000/api/docs   Logs: .run/"
    ;;
esac
