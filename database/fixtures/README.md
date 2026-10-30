# Fixtures

`emachine/` holds **sample** responses for each named eMachine query in
`config/integrations.config.json`. The backend reads them instead of calling
eMachine when `EMACHINE_MODE=fixtures`, which is how the test suites and
offline development run. They are illustrative only and are never used in
`live` mode.

Line fixtures (`tagLabor.json` etc.) contain lines for every sample tag; the
client filters them by `tag_id`.
