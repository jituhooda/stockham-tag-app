#!/usr/bin/env bash
# Install what local development needs and create .env files from the examples.
source "$(dirname "$0")/_common.sh"

info "Checking tools"
need node; need npm
node -e 'process.exit(+process.versions.node.split(".")[0] < 20)' || die "Node 20+ is required"
ok "node $(node -v)"

[[ -f "$ROOT/.env" ]] || { cp "$ROOT/.env.example" "$ROOT/.env"; ok "Created .env"; }
[[ -f "$ROOT/frontend/.env.local" ]] || { cp "$ROOT/frontend/.env.example" "$ROOT/frontend/.env.local"; ok "Created frontend/.env.local"; }

info "Installing frontend dependencies"
(cd "$ROOT/frontend" && npm ci)

ok "Setup complete. Run scripts/start.sh, then sign in with your eMachine access token."
warn "Saving to eMachine is off (VITE_EMACHINE_WRITES=false in frontend/.env.local) until you turn it on."
