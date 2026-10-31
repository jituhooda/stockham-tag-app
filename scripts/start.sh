#!/usr/bin/env bash
# Start the web app.
#   scripts/start.sh            Vite dev server on :5173 (forwards /datamodel to eMachine)
#   scripts/start.sh --docker   docker compose (nginx on :8080)
source "$(dirname "$0")/_common.sh"

case "${1:-}" in
  --docker) compose up -d --build; ok "Web app: http://localhost:${WEB_PORT:-8080}" ;;
  ""|--local)
    mkdir -p "$RUN_DIR"
    [[ -f "$RUN_DIR/web.pid" ]] && kill -0 "$(cat "$RUN_DIR/web.pid")" 2>/dev/null && die "Already running; use scripts/stop.sh"
    (cd "$ROOT/frontend" && nohup npm run dev > "$RUN_DIR/web.log" 2>&1 & echo $! > "$RUN_DIR/web.pid")
    "$ROOT/scripts/health-check.sh" --url http://localhost:5173 --wait 30 >/dev/null && ok "Web app: http://localhost:5173" \
      || warn "Not up yet; see .run/web.log"
    ;;
  -h|--help) sed -n '2,4p' "$0" ;;
  *) die "Unknown option $1" ;;
esac
