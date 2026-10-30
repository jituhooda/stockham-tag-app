# Troubleshooting

Every API response carries `X-Request-ID`; search the logs for it.

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Banner "Tags from eMachine are unavailable" | eMachine down, wrong URL or token, or network policy blocks the host | `curl $EMACHINE_BASE_URL` from the API host; check `EMACHINE_API_TOKEN`; `/health/ready` shows `tokenConfigured` |
| Pickers say "Employees/Jobs unavailable" (502) | same as above | same; or run with `EMACHINE_MODE=fixtures` to work offline |
| Fields blank for eMachine data | eMachine column names differ from the ones the app expects | add the real column name to the candidate lists in `backend/apexapp/integrations/emachine_mapping.py` |
| No jobs in the Job picker | your division has no jobs, or division lookup failed | menu → **You are** → pick your name; check `GET /api/v1/master/division?employee=…` |
| "Sign in required" loop | `AUTH_MODE=token` and the token isn't in `AUTH_TOKENS` | fix `AUTH_TOKENS` (valid JSON) and restart |
| 409 "can no longer be edited" | tag is Submitted/Signed/Approved | an approver can **Reject** it to reopen |
| 422 when submitting | tag incomplete | the response's `problems` list says what's missing |
| Upload fails "aren't allowed" / "don't match" | file type not allow-listed, or renamed file | add the type to `security.config.json` → `uploads.allowedTypes` |
| 413 from nginx | file > 12 MB | raise `client_max_body_size` and `uploads.maxBytes` together |
| `database is locked` (SQLite) | many simultaneous writers | move to PostgreSQL (`scripts/db-switch.sh`) |
| API won't start: migration error | a migration failed half-way on a non-transactional change, or files edited after release | `scripts/db-migrate.sh --status`; restore the last backup; never edit shipped migrations |
| `scripts/db-verify.sh` reports mismatches | schema drifted from `data-model/` | add a migration, or update the model if the change was intended |
| Blank page after deploy | browser cached old `index.html` | nginx serves it `no-cache`; hard-refresh once |
| `scripts/validate-export.sh` reports "changed" | files edited after export | intended? run `--update-hashes` |
