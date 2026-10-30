# Security

## Secrets

- The **eMachine token** is only ever read by the backend (`EMACHINE_API_TOKEN`).
  The browser never sees it, so it can't leak through the JavaScript bundle.
- `AUTH_TOKENS`, `POSTGRES_PASSWORD` and `EMACHINE_API_TOKEN` belong in `.env` /
  a secret store. `.env` files are git-ignored; only `*.example` files are committed.
- **Rotate the eMachine token** if it has ever been pasted into chat, email or
  a repository.

## Authentication and authorisation

- `AUTH_MODE=none` makes every request an anonymous user with `defaultRole`.
  Use it only for development or behind a proxy that authenticates users.
- `AUTH_MODE=token`: clients send `Authorization: Bearer <token>`; tokens are
  compared in constant time. The web app asks for a token on its sign-in screen
  and keeps it in `localStorage`.
- Every route declares the permission it needs (`rbac.py`); `created_by` and
  `uploaded_by` come from the authenticated user, not the request body.

For company-wide SSO, put the app behind an identity-aware proxy (e.g.
oauth2-proxy, Cloudflare Access) and keep `AUTH_MODE=none`, or extend
`auth.py` to validate your IdP's JWTs.

## Input handling

- All request bodies are validated by Pydantic (types, lengths, non-negative numbers, list sizes).
- eMachine queries are fixed templates from config; the only user-supplied
  values (employee, divisions) are escaped with `sql_literal` and length-limited,
  and the tag id placeholder is always an integer.
- Uploads: allow-listed MIME types, magic-byte check, size limit, sanitised file
  names, random storage keys (no user input in paths). Non-image/PDF files are
  served with `Content-Disposition: attachment`.
- Signatures must be real PNGs under `maxSignatureBytes`.

## HTTP hardening

- API: `nosniff`, `X-Frame-Options: DENY`, restrictive CSP, `no-store`, request ids.
- nginx: CSP for the SPA (`'self'` only; `blob:`/`data:` images), same headers,
  12 MB body limit, no server tokens. Enable HSTS once on HTTPS.
- CORS only for configured origins. Unhandled errors return a generic message;
  details go to the log with the request id.
- Containers run as non-root; the Kubernetes API pod uses a read-only root filesystem.

## Tests

`tests/security` covers token checks, role enforcement, spoofed user names,
headers, CORS, SQL literal escaping, upload type/size checks, odd ids,
fake signatures and error leakage.

## Reporting

Report vulnerabilities privately to the Stockham IT contact rather than in an issue.
