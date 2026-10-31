# eMachine fixtures

Sample responses used **only by the browser tests**: `tests/e2e/helpers.mjs`
answers the app's eMachine requests from these files, so tests never call the
real eMachine. Column names follow the queries captured from the existing app.
Line files (`tag*.json`) hold lines for every sample tag and are filtered by `tag_id`.
