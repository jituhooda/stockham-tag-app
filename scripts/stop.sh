#!/usr/bin/env bash
# Stop what start.sh started.  --docker stops the compose stack.
source "$(dirname "$0")/_common.sh"

if [[ "${1:-}" == "--docker" ]]; then
  compose -f "$ROOT/docker-compose.prod.yml" down
  exit 0
fi

stopped=0
for name in web api; do
  pidfile="$RUN_DIR/$name.pid"
  if [[ -f "$pidfile" ]]; then
    pid="$(cat "$pidfile")"
    if kill -0 "$pid" 2>/dev/null; then
      pkill -TERM -P "$pid" 2>/dev/null || true
      kill -TERM "$pid" 2>/dev/null || true
      ok "Stopped $name ($pid)"
      stopped=1
    fi
    rm -f "$pidfile"
  fi
done
[[ $stopped == 1 ]] || warn "Nothing was running"
