#!/usr/bin/env bash
# Check the API (and the web app if reachable).
#   scripts/health-check.sh [--url http://localhost:8000] [--web http://localhost:8080] [--wait SECONDS]
source "$(dirname "$0")/_common.sh"
need curl

api="${API_URL:-http://localhost:8000}"; web=""; wait=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --url) api="$2"; shift 2 ;;
    --web) web="$2"; shift 2 ;;
    --wait) wait="$2"; shift 2 ;;
    *) die "Unknown option $1" ;;
  esac
done

deadline=$(( $(date +%s) + wait ))
until body="$(curl -fsS --max-time 5 "$api/health/ready" 2>/dev/null)"; do
  (( $(date +%s) >= deadline )) && die "API at $api is not ready"
  sleep 2
done
ok "API ready: $body"

curl -fsS --max-time 5 "$api/api/v1/config" >/dev/null && ok "Config endpoint OK" || die "Config endpoint failed"

if [[ -n "$web" ]]; then
  curl -fsS --max-time 5 "$web/healthz" >/dev/null && ok "Web server OK ($web)" || die "Web server at $web failed"
  curl -fsS --max-time 5 "$web/api/v1/config" >/dev/null && ok "Web → API proxy OK" || die "nginx is not reaching the API"
fi
