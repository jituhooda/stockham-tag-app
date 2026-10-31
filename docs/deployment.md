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

Serve `frontend/dist/` with any web server that (1) falls back to
`index.html` for unknown paths and (2) proxies `/datamodel/` to
`https://emachine.instantar.io` (see `infrastructure/nginx/nginx.conf`).
If you can't proxy, build with `VITE_EMACHINE_BASE_URL=https://emachine.instantar.io`;
eMachine must then allow your site's origin.

## Netlify

`netlify.toml` (repo root) is the Netlify equivalent of the nginx config: it builds
`frontend/`, forwards `/datamodel/*` and `/cloudproviders/*` to eMachine, falls back to
`index.html` for client-side routes, and sets the same security and cache headers.

1. Import the repo in Netlify; the build settings come from `netlify.toml`.
2. Under Site settings > Environment variables, set `VITE_EMACHINE_WRITES=true` (otherwise Save
   sends nothing) and `VITE_PUBLIC_URL` to the site URL (used by the install QR code).
   Leave `VITE_EMACHINE_BASE_URL` empty. Don't set `VITE_EMACHINE_TOKEN`: it is public.
3. The browser calls `stockham.emachine.ai` (Submit, Autodesk token) and
   `developer.api.autodesk.com` directly, so both must allow the Netlify origin via CORS.
4. Netlify proxy rewrites time out after about 26 seconds. If large Files-tab uploads or slow
   queries fail, set `VITE_EMACHINE_BASE_URL=https://emachine.instantar.io` (eMachine must
   then allow the site's origin via CORS).

## Going live checklist

- [ ] Try a save on a test tag with read-only mode on: check the console output matches what eMachine expects.
- [ ] Build with `VITE_EMACHINE_WRITES=true` and save that test tag for real; verify it in eMachine.
- [ ] Decide on tokens: each user pastes their own (default) or a limited service token is built in.
- [ ] HTTPS and HSTS.
- [ ] `scripts/health-check.sh --emachine` (read-only `SELECT 1`) passes from the server.
