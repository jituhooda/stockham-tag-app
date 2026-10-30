# Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Back on the sign-in screen | eMachine rejected the token (expired or revoked) | Paste a fresh token |
| "Can’t reach eMachine" | proxy not forwarding, or network blocks eMachine | `scripts/health-check.sh --emachine` on the server; check `/datamodel` in nginx |
| CORS error in the console | app built with `VITE_EMACHINE_BASE_URL` set and eMachine refuses this origin | build with it empty and use the proxy |
| Save says "Read-only mode" | `VITE_EMACHINE_WRITES` isn't `true` in this build | rebuild with it on (after testing) |
| "Removing saved lines isn’t connected" | eMachine delete API not wired yet | reload the tag to undo; remove the line in eMachine |
| Add Tag does nothing but explain | creating tags isn't wired yet (`features.createTags`) | capture the create request and response |
| Blank fields | eMachine column differs from the configured query | adjust the query in `config/integrations.config.json` |
| No jobs in the Job picker | division not found | menu → **Show jobs for** → pick the employee |
| Trade list empty | the `trades` query (table `trade`) differs in your eMachine | adjust `queries.trades` |
| `validate-export.sh` reports "changed" | files edited after the last hash update | intended? run `--update-hashes` |
