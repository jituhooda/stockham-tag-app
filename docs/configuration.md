# Configuration

Everything is bundled into the web app at build time.

## `config/` (checked in, validated by `config/config.schema.json`)

| File | Contents |
| --- | --- |
| `app.config.json` | name, version, default divisions, editable statuses |
| `branding.config.json` | company name, titles, colours |
| `features.config.json` | switches; parts without a known eMachine API stay `false` (`createTags`, `deleteLines`, `attachments`, `issues`, `submit`) |
| `integrations.config.json` | eMachine paths, **all read queries**, and the fields each table write may send |

Only flip a feature switch once its eMachine call is implemented and tested.

## Build-time variables (`frontend/.env.local`, Docker build args)

| Variable | Default | |
| --- | --- | --- |
| `VITE_EMACHINE_WRITES` | `false` | **Saving to eMachine.** Off = Save logs requests and sends nothing |
| `VITE_EMACHINE_BASE_URL` | empty | empty = same origin via the `/datamodel` proxy; or a full URL to call eMachine directly (needs CORS) |
| `VITE_EMACHINE_TOKEN` | empty | built-in token for every user (visible to anyone who loads the site); empty = users paste their own |
| `EMACHINE_PROXY_TARGET` | `https://emachine.instantar.io` | where `npm run dev` / `preview` forward `/datamodel` |

Root `.env` (docker compose / scripts): `WEB_PORT`, `APP_VERSION`, `VITE_EMACHINE_WRITES`.

## On the device

Stored in the browser's localStorage: the access token (if pasted), the chosen
employee / divisions, and remembered approver names per customer.
