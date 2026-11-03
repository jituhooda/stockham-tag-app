# Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Back on the sign-in screen | eMachine rejected the token (expired or revoked) | Paste a fresh token |
| "Can’t reach eMachine" | the browser can't reach emachine.instantar.io (network, or eMachine down) | `scripts/health-check.sh --emachine` |
| CORS error in the console | eMachine refuses this site's origin, or a request sends a header eMachine's CORS settings don't list | ask the eMachine admins to allow the origin / header |
| Save says "Read-only mode" | `VITE_EMACHINE_WRITES` isn't `true` in this build | rebuild with it on (after testing) |
| "Removing saved lines isn’t connected" | eMachine delete API not wired yet | reload the tag to undo; remove the line in eMachine |
| Blank fields | eMachine column differs from the configured query | adjust the query in `config/integrations.config.json` |
| No jobs in the Job picker | division not found | menu → **Show jobs for** → pick the employee |
| Trade list empty | the `trades` query (table `trade`) differs in your eMachine | adjust `queries.trades` |
| `validate-export.sh` reports "changed" | files edited after the last hash update | intended? run `--update-hashes` |
