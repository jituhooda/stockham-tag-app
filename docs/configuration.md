# Configuration

Settings come from `config/*.json` (checked in, validated by
`config/config.schema.json`) and are overridden by environment variables
(secrets and per-environment values). Example environment files are in
`config/environments/`, `.env.example`, `backend/.env.example` and
`frontend/.env.example`.

## Files

| File | Contents |
| --- | --- |
| `app.config.json` | name, version, default divisions, new-tag number prefix, editable statuses |
| `database.config.json` | default dialect and SQLite/PostgreSQL options, migrations dir |
| `branding.config.json` | company name, titles, colours (sent to the browser) |
| `features.config.json` | premium time, send-for-signature, issues query, eMachine tags in list |
| `integrations.config.json` | eMachine URL, timeout, cache TTL, mode, **all SQL queries** |
| `security.config.json` | auth mode, default role, CORS, upload limits and types |
| `logging.config.json` | level, text/json |

Relative paths in these files resolve against `config/`.

## Environment variables (backend)

| Variable | Default | |
| --- | --- | --- |
| `APP_ENV` | development | shown in `/health/ready` |
| `CONFIG_DIR` | `<repo>/config` | |
| `DATABASE_URL` | SQLite in `data/` | |
| `RUN_MIGRATIONS` | true | migrate on startup |
| `EMACHINE_MODE` | live | `fixtures` = offline sample data |
| `EMACHINE_API_TOKEN` | — | **secret** |
| `EMACHINE_BASE_URL` | from JSON | |
| `EMACHINE_CACHE_TTL` | 300 | seconds |
| `AUTH_MODE` | none | `token` to require sign-in |
| `AUTH_TOKENS` | — | **secret**, JSON `{token: {name, role}}` |
| `CORS_ORIGINS` | from JSON | comma-separated |
| `ATTACHMENTS_DIR` | `data/attachments` | relative to the working directory |
| `ISSUES_QUERY` | — | SQL for the Issues picker |
| `STATIC_DIR` | — | serve a built web app from the API |
| `LOG_LEVEL`, `LOG_FORMAT` | INFO, text | |
| `WARM_CACHE` | 1 | prefetch reference data at startup |

## Frontend (build time)

| Variable | |
| --- | --- |
| `VITE_API_BASE_URL` | API origin if not same-origin (default: same origin) |
| `VITE_DEV_BACKEND_URL` | where `npm run dev` proxies `/api` (default `http://localhost:8000`) |
| `VITE_REQUEST_TIMEOUT_MS` | default 30000 |

## Roles

| Role | Can |
| --- | --- |
| viewer | read tags and reference data |
| editor | + create, edit, delete drafts, upload, submit, add approvers |
| approver | + approve / reject |
| admin | everything |

## Changing the eMachine queries

Edit `integrations.config.json`. Placeholders: `{employee}`, `{divisions}`
(already quoted by the backend) and `{tag_id}` (an integer). Restart the API.
