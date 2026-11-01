# Configuration

Everything is bundled into the web app at build time.

## `config/` (checked in, validated by `config/config.schema.json`)

| File | Contents |
| --- | --- |
| `app.config.json` | name, version, default divisions, editable statuses |
| `branding.config.json` | company name, titles, colours |
| `features.config.json` | switches; parts without a known eMachine API stay `false` |
| `integrations.config.json` | eMachine paths, **all read queries**, and the fields each table write may send |

Only flip a feature switch once its eMachine call is implemented and tested.

## Build-time variables (`frontend/.env.local`, Docker build args)

| Variable | Default | |
| --- | --- | --- |
| `VITE_EMACHINE_WRITES` | `false` | **Saving to eMachine.** Off = Save logs requests and sends nothing |
| `VITE_EMACHINE_BASE_URL` | empty | empty = same origin via the `/datamodel` proxy; or a full URL to call eMachine directly (needs CORS) |
| `VITE_EMACHINE_READ_URL` | `https://emachine.instantar.io` | where reads (`model_query` SELECTs) go: directly to eMachine by default. Saves, deletes and uploads use `VITE_EMACHINE_BASE_URL` (the proxy) because their `eml-service` header isn't allowed by eMachine's CORS settings |
| `VITE_EMACHINE_TOKEN` | empty | built-in token for every user (visible to anyone who loads the site); empty = users paste their own |
| `VITE_KEYCLOAK_ISSUER` / `VITE_KEYCLOAK_CLIENT_ID` | from `auth` in `config/integrations.config.json` | Keycloak realm URL and client used by **Sign in** (see below) |
| `EMACHINE_PROXY_TARGET` | `https://emachine.instantar.io` | where `npm run dev` / `preview` forward `/datamodel` |

Root `.env` (docker compose / scripts): `WEB_PORT`, `APP_VERSION`, `VITE_EMACHINE_WRITES`.

## Keycloak sign-in

The sign-in screen sends users to Keycloak (`auth.issuer`, client `auth.clientId` in
`config/integrations.config.json`) using the authorization-code flow with PKCE, and Logout ends the Keycloak
session with the refresh token. In Keycloak (realm `Stockham`, client `emachine`) set:

- **Valid redirect URIs**: one entry for every address the app is served from, e.g.
  `https://stockham-tag-app-20290.netlify.app/*`, `https://aziro.ngrok.app/*`, `http://localhost:5190/*`
  (the app redirects back to `<origin>/`).
- **Web origins**: the same origins (or `+`), so the browser may call the token and logout endpoints.
- **Standard flow** on, **Client authentication** off (public client), **PKCE method** `S256`.
- Keep `offline_access` out of `auth.scope`: offline refresh tokens never expire.

## On the device

Stored in the browser's localStorage: the access token (if pasted), the chosen
employee / divisions, and remembered approver names per customer.
