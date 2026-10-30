# Stockham Tags

Change-order tags for **Stockham Construction**. Field staff record extra work
on a job (labor, materials, equipment, other charges, photos and the issues it
addresses), and the customer's approver signs on the device or by email. It is
one responsive web app for phones, tablets and desktop browsers.

| Phone | Tablet | Desktop |
| --- | --- | --- |
| one screen at a time, like the mockups (also works on its side) | tag list on the left, open tag on the right | the same, with roomier forms and a wider list |

## Quick start

```bash
scripts/setup.sh                 # installs dependencies, creates .env files, migrates SQLite
scripts/start.sh --fixtures      # API :8000 + web :5173 with offline sample data
```

Open http://localhost:5173. For real data, put the eMachine token in
`backend/.env` (`EMACHINE_API_TOKEN=`) and run `scripts/start.sh`.

With Docker:

```bash
cp .env.example .env             # set EMACHINE_API_TOKEN
docker compose up -d --build     # http://localhost:8080
```

## How it works

```
browser ──▶ nginx (React app) ──/api──▶ FastAPI ──▶ SQLite / PostgreSQL
                                           └──────▶ eMachine (reference data, read-only)
```

- **Reference data** (employees, jobs, materials, equipment, expense types,
  labor trades) comes from eMachine through the backend, which base64-encodes
  the SQL and adds the bearer token. The token never reaches the browser.
- **Tags** are stored in this app's database. Tags that exist only in eMachine
  appear in the list too, and are copied in the first time someone saves one.
- **Lifecycle:** Draft → Signed (signed in person) or Submitted (sent for
  signature) → Approved / Rejected (Rejected is editable again).

## Repository layout

| Path | What |
| --- | --- |
| `frontend/` | React + Vite app (JSX) |
| `backend/` | FastAPI app (`apexapp`) |
| `data-model/` | Canonical logical data model |
| `database/` | Migrations (SQLite + PostgreSQL), schema snapshots, seeds, fixtures, portability rules |
| `config/` | App, database, branding, features, integrations, security, logging settings (+ schema) |
| `api/` | OpenAPI (YAML/JSON), Swagger config, Postman collection |
| `tests/` | Integration, API contract, security, database portability, browser e2e |
| `infrastructure/` | Docker, nginx, monitoring, Kubernetes |
| `scripts/` | Setup, start/stop, health, DB tasks, backup/restore, export validation |
| `docs/` | Architecture, API, database, deployment, configuration, security, troubleshooting |
| `.apexstudio/` | Export metadata and integrity hashes |

## Tests

```bash
scripts/validate-export.sh --tests             # everything below, on SQLite
cd backend && uv run pytest                    # backend unit/API tests
cd backend && uv run pytest ../tests           # integration, contract, security, portability
cd frontend && npm test                        # frontend unit tests
cd tests/e2e && npm install && npm test        # browser tests against a running stack (--fixtures)
```

Add `TEST_DATABASE_URL` / `TEST_POSTGRES_URL` to run the database tests on PostgreSQL.

CI (`.github/workflows/ci.yml`) runs all of the above on every pull request and
push to `main`, with the backend suites on both SQLite and PostgreSQL, and also
builds and smoke-tests the Docker images.

## Documentation

[Architecture](docs/architecture.md) · [API](docs/api.md) ·
[Database](docs/database.md) · [Portability](docs/database-portability.md) ·
[Configuration](docs/configuration.md) · [Deployment](docs/deployment.md) ·
[Security](docs/security.md) · [Troubleshooting](docs/troubleshooting.md) ·
[Code generation](docs/code-generation.md) · [Changelog](CHANGELOG.md)

## License

Proprietary. See [LICENSE](LICENSE).
