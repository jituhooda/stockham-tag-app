# Code generation

This project is an ApexStudio export: `frontend/` and `backend/` are
application code, and the folders around them describe, configure, test and
deploy it. `.apexstudio/` records how the export was produced.

## Generated vs. hand-maintained

| Artifact | Source of truth | Regenerate with |
| --- | --- | --- |
| `api/openapi.json`, `api/openapi.yaml`, `api/postman-collection.json` | The FastAPI routes and schemas | `cd backend && uv run python -m apexapp.utils.export_openapi` |
| `database/schema/<dialect>/schema.sql` | `database/migrations` | `scripts/db-verify.sh --dump` (once per dialect) |
| `data-model/` | Hand-maintained; checked against migrations by tests | — |
| `.apexstudio/artifact-hashes.json` | All tracked files | `scripts/validate-export.sh --update-hashes` |
| `frontend/package-lock.json`, `backend/uv.lock` | Package manifests | `npm install`, `uv lock` |

`tests/api/test_contract.py` fails when the committed OpenAPI or Postman files
are out of date, and `tests/database-portability` fails when the data model,
`schema.py` and the migrations disagree.

## Changing the app

1. Change code under `frontend/` or `backend/`.
2. Schema change? Add a migration (see `database/README.md`), update
   `backend/apexapp/schema.py` and `data-model/`.
3. API change? Re-export the OpenAPI files.
4. Run `scripts/validate-export.sh --update-hashes --tests`.
5. Note the change in `CHANGELOG.md`; bump `VERSION` for releases.
