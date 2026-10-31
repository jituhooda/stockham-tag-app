#!/usr/bin/env bash
# Stop what start.sh started.  --docker stops the compose stack.
source "$(dirname "$0")/_common.sh"

if [[ "${1:-}" == "--docker" ]]; then
  compose down
  exit 0
fi
pidfile="$RUN_DIR/web.pid"
if [[ -f "$pidfile" ]] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
  pid="$(cat "$pidfile")"
  pkill -TERM -P "$pid" 2>/dev/null || true
  kill -TERM "$pid" 2>/dev/null || true
  ok "Stopped web app ($pid)"
else
  warn "Nothing was running"
fi
rm -f "$pidfile"
