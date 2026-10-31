# Stockham Tags

Change-order tags for **Stockham Construction**. Field staff record extra work
on a job (labor, materials, equipment and other charges) against eMachine data.
It is one responsive web app for phones, tablets and desktop browsers, with **no
backend and no database**: it reads and saves eMachine directly.

| Phone | Tablet | Desktop |
| --- | --- | --- |
| one screen at a time, like the mockups (also works on its side) | tag list on the left, open tag on the right | the same, with roomier forms and a wider list |

> ## ⚠️ TODO before real users: secure the Autodesk token service
>
> Adding a tag gets an Autodesk Forma token from **`https://stockham.emachine.ai/stockham/token`**
> (`forma.tokenUrl` in `config/integrations.config.json`). That endpoint is **public: no login needed**, so
> anyone who knows the URL can get a working Autodesk token. This is fine for testing only.
> Before going live, lock it down (require the user's eMachine token or another login, and/or restrict allowed
> origins) and, if it then needs credentials, update `frontend/lib/forma.js` to send them.
> Details: [docs/security.md](docs/security.md#todo-secure-the-autodesk-token-service).
>
> The eMachine token in `frontend/.env.local` (`VITE_EMACHINE_TOKEN`) has the same problem: it is built into the
> page for everyone, so keep the app URL private until each person signs in with their own token.

## Quick start

```bash
scripts/setup.sh      # installs dependencies, creates .env files
scripts/start.sh      # http://localhost:5173 — sign in with your eMachine access token
```

**Saving to eMachine is off by default.** Save then logs the exact requests it
would send to the browser console and sends nothing. When you've checked them,
set `VITE_EMACHINE_WRITES=true` in `frontend/.env.local` and restart.

With Docker (nginx on http://localhost:8080):

```bash
docker compose up -d --build                              # read-only
VITE_EMACHINE_WRITES=true docker compose up -d --build    # saving enabled
```

## Install on a phone

The app is a PWA, so it opens full-screen like a native app (needs HTTPS, e.g. ngrok or your own host).
Send people **`/install`** (e.g. `https://your-host/install`): it shows a QR code, a share link and
illustrated steps for iPhone and Android, and needs no sign-in. Set `VITE_PUBLIC_URL` so the QR code
uses your public address.

- **iPhone/iPad:** open the site in **Safari** → Share → **Add to Home Screen**.
- **Android:** open it in **Chrome** → menu (⋮) → **Install app** (or **Add to Home screen**).

## How it works

```
browser ──▶ nginx (React app) ──/datamodel──▶ eMachine
                                  GET  model_query?query=<base64 SQL>   (reads)
                                  POST /datamodel/api/<table>           (saves)
```

- All read queries are in `config/integrations.config.json`.
- Saves send only what changed: `Id` plus changed fields for existing rows;
  all fields plus `tag_id` for new cost lines. Details: [docs/api.md](docs/api.md).

## What's connected

| | |
| --- | --- |
| ✅ Tag list, details, labor, material, equipment, expenses | read from eMachine |
| ✅ Edit details; add and change cost lines | saved to eMachine |
| 🧪 Create a tag (Add Tag → pick a job) | wired to the fields of a captured save; not yet run against live eMachine |
| ✅ Remove a cost line | asks to confirm, then deletes in eMachine |
| 🧪 Files: list, add (photo editor), delete | wired to the captured upload; not yet run against live eMachine |
| 🧪 Issues: pick Forma issues, save, remove | reads are captured; the save/remove requests are inferred |
| 🧪 Sign: approver list, add approver, signature pad | list is captured; "+" is inferred |
| 🧪 Submit (sign in person) | saves, reads back the cost lines, posts one request to the signed-document service; tested only against fakes |
| ⏳ Send for signature | **disabled** until its request is captured |

## Repository layout

| Path | What |
| --- | --- |
| `frontend/` | React + Vite app (JSX) |
| `config/` | App, branding, feature switches, eMachine queries and write fields (+ schema) |
| `api/` | The eMachine endpoints the app uses (OpenAPI) |
| `tests/e2e/` | Browser tests against a mock eMachine |
| `infrastructure/` | Docker and nginx (serves the app, proxies `/datamodel` to eMachine) |
| `scripts/` | Setup, start/stop, health check, export validation |
| `docs/` | Architecture, API, configuration, deployment, security, troubleshooting |
| `.apexstudio/` | Export metadata and integrity hashes |

## Tests

```bash
cd frontend && npm test                       # unit tests (no network)
scripts/validate-export.sh --tests            # structure + unit tests + build
```

Browser tests: see [tests/e2e/README.md](tests/e2e/README.md). They run against
a mock at `https://emachine.invalid` and never contact the real eMachine. CI
(`.github/workflows/ci.yml`) runs all of them and builds the Docker image.

## Documentation

[Architecture](docs/architecture.md) · [eMachine API](docs/api.md) ·
[Configuration](docs/configuration.md) · [Deployment](docs/deployment.md) ·
[Security](docs/security.md) · [Troubleshooting](docs/troubleshooting.md) ·
[Code generation](docs/code-generation.md) · [Changelog](CHANGELOG.md)

## License

Proprietary. See [LICENSE](LICENSE).
