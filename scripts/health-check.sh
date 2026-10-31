#!/usr/bin/env bash
# Check the web app is serving.
#   scripts/health-check.sh [--url http://localhost:8080] [--wait SECONDS] [--emachine]
# --emachine also runs one read-only query (SELECT 1) through the site's
# /datamodel proxy with $EMACHINE_TOKEN, to prove the proxy reaches eMachine.
source "$(dirname "$0")/_common.sh"
need curl

url="http://localhost:${WEB_PORT:-8080}"; wait=0; emachine=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --url) url="$2"; shift 2 ;;
    --wait) wait="$2"; shift 2 ;;
    --emachine) emachine=1; shift ;;
    *) die "Unknown option $1" ;;
  esac
done

deadline=$(( $(date +%s) + wait ))
until curl -fsS --max-time 5 "$url/" -o /dev/null 2>/dev/null; do
  (( $(date +%s) >= deadline )) && die "Web app at $url is not responding"
  sleep 2
done
ok "Web app serving at $url"
curl -fsS --max-time 5 "$url/healthz" -o /dev/null 2>/dev/null && ok "nginx health endpoint OK" || true

if [[ $emachine == 1 ]]; then
  [[ -n "${EMACHINE_TOKEN:-}" ]] || die "Set EMACHINE_TOKEN for --emachine"
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 -H "authorization: Bearer $EMACHINE_TOKEN" \
    "$url/datamodel/api/model_query?query=$(printf 'SELECT 1' | base64)")
  [[ "$code" == 200 ]] && ok "eMachine reachable through the proxy (read-only check)" || die "eMachine check returned HTTP $code"
fi
