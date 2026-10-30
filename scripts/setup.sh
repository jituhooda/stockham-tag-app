#!/usr/bin/env bash
# Install everything needed for local development and create .env files.
source "$(dirname "$0")/_common.sh"

info "Checking tools"
need uv; need node; need npm
node -e 'process.exit(+process.versions.node.split(".")[0] < 20)' || die "Node 20+ is required"
ok "uv $(uv --version | cut -d' ' -f2), node $(node -v)"

for f in .env backend/.env frontend/.env; do
  if [[ ! -f "$ROOT/$f" ]]; then
    cp "$ROOT/$f.example" "$ROOT/$f"
    ok "Created $f from $f.example"
  fi
done

info "Installing backend dependencies"
(cd "$ROOT/backend" && uv sync)
info "Installing frontend dependencies"
(cd "$ROOT/frontend" && npm ci)

info "Preparing the database"
mkdir -p "$ROOT/data"
"$ROOT/scripts/db-migrate.sh"

ok "Setup complete. Next: put EMACHINE_API_TOKEN in backend/.env (or use --fixtures), then scripts/start.sh"
