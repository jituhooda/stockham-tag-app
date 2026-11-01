# Deployment

The app is static files plus a small nginx config that forwards `/datamodel/`
to eMachine. Any host that can do that works (nginx via Docker, or Netlify; see below).

## Docker

```bash
docker compose up -d --build                         # read-only: Save sends nothing
VITE_EMACHINE_WRITES=true docker compose up -d --build   # saving enabled
scripts/health-check.sh --url http://localhost:8080
```

Put HTTPS in front of port 8080 (load balancer or reverse proxy), then enable
HSTS in `infrastructure/nginx/security-headers.conf`.

## Without Docker

```bash
cd frontend && npm ci && VITE_EMACHINE_WRITES=true npm run build
```

Serve `frontend/dist/` with any static web server that falls back to `index.html` for unknown paths
(see `infrastructure/nginx/nginx.conf`). The app calls eMachine and `stockham.emachine.ai` directly from the browser; the server
proxies nothing.

## Netlify

`netlify.toml` (repo root) is the Netlify equivalent of the nginx config: it builds
`frontend/`, falls back to `index.html` for client-side routes, and sets the same security and cache headers. Nothing is proxied.

1. Import the repo in Netlify; the build settings come from `netlify.toml`.
2. Under Site settings > Environment variables, set `VITE_EMACHINE_WRITES=true` (otherwise Save
   sends nothing) and `VITE_PUBLIC_URL` to the site URL (used by the install QR code).
   Don't set `VITE_EMACHINE_TOKEN`: it is public (and a local `netlify deploy --build` reads `frontend/.env.local`, so build with `VITE_EMACHINE_TOKEN=` empty).
3. The browser calls `emachine.instantar.io`, `stockham.emachine.ai` (Submit, Autodesk token) and
   `developer.api.autodesk.com` directly, so all three must allow the Netlify origin via CORS.

## Going live checklist

- [ ] Try a save on a test tag with read-only mode on: check the console output matches what eMachine expects.
- [ ] Build with `VITE_EMACHINE_WRITES=true` and save that test tag for real; verify it in eMachine.
- [ ] Decide on tokens: each user pastes their own (default) or a limited service token is built in.
- [ ] HTTPS and HSTS.
- [ ] `scripts/health-check.sh --emachine` (read-only `SELECT 1`) passes from the server.
