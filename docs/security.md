# Security

## TODO: secure the Autodesk token service

**Status: open (testing only).** Before real users, do this:

- `GET https://stockham.emachine.ai/stockham/token` (set as `forma.tokenUrl` in
  `config/integrations.config.json`) returns `{ access_token, expires_at }` to **anyone**: no authentication, and
  CORS allows any origin (`access-control-allow-origin: *`). Anyone who finds the URL can get an Autodesk token
  with the app's permissions (it reads projects in the Stockham account).
- Secure it on the service side: require the user's eMachine bearer token (or another login), and/or limit the
  allowed origins to this app's address. Keep the token's Autodesk scopes as narrow as possible.
- Then update `fetchToken()` in `frontend/lib/forma.js` to send the credentials, and add this app's origin to the
  service's CORS allow-list.
- Also consider moving the whole Forma check behind eMachine or this site's proxy, so the Autodesk token never
  reaches the browser at all. Today the browser holds it in memory for up to about an hour.

Also open: the eMachine token in `frontend/.env.local` (`VITE_EMACHINE_TOKEN`) is bundled into the page and
visible to everyone who can load it; see "Tokens" below.

## Tokens

- The app sends the user's eMachine bearer token with every request. It lives in
  the browser (localStorage) and is sent only to this site's `/datamodel` proxy
  (or eMachine directly).
- **Never build a personal or admin token into the app** (`VITE_EMACHINE_TOKEN`):
  anything in `VITE_*` is readable by everyone who loads the site. If you need a
  built-in token, ask the eMachine admin for one limited to the tag tables.
- Tokens shared in chat or email should be revoked and re-issued.
- The nginx proxy drops cookies and the `Origin` header, so only the bearer token
  authenticates requests.

## Writes

- Read-only by default (`VITE_EMACHINE_WRITES=false`).
- Only allow-listed tables and fields can be written (`writes` in
  `config/integrations.config.json`); updates send only changed fields.
- Ids put into SQL must be integers; text values are quoted and escaped.
- Features whose eMachine API isn't known are disabled rather than guessed.

## HTTP hardening (nginx)

CSP limited to this site and eMachine, `nosniff`, `X-Frame-Options: DENY`,
strict referrer policy, no server tokens. Enable HSTS once on HTTPS.

## Tests

Browser tests run against a mock at `https://emachine.invalid` and block every
other outside request, so they cannot reach real eMachine data.
