# Code generation

This project follows the ApexStudio export layout, trimmed to a frontend-only
app: `frontend/` is the application; `config/`, `api/`, `tests/`,
`infrastructure/`, `scripts/` and `docs/` describe, configure, test and deploy
it. `.apexstudio/` records how the export was produced.

| Artifact | Maintained by |
| --- | --- |
| `frontend/` | hand-edited application code |
| `config/*.json` | hand-edited; validated against `config.schema.json` by `scripts/validate-export.sh` (JSON syntax) |
| `api/openapi.yaml` | hand-maintained record of the eMachine endpoints used |
| `.apexstudio/artifact-hashes.json` | `scripts/validate-export.sh --update-hashes` |
| `frontend/package-lock.json` | `npm install` |

## Changing the app

1. Edit `frontend/` (and `config/` for queries or switches).
2. New eMachine call? Add it to `api/openapi.yaml` and `docs/api.md`, and a fixture plus test in `tests/e2e`.
3. `cd frontend && npm test`; run the browser tests (see `tests/e2e/README.md`).
4. `scripts/validate-export.sh --update-hashes`, note the change in `CHANGELOG.md`.
