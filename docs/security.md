# Security

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
