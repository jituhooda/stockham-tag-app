# End-to-end tests

Browser tests that drive the real web app and API. They expect a stack running
with sample data (`EMACHINE_MODE=fixtures`) and a fresh database:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d   # or scripts/start.sh --fixtures
cd tests/e2e && npm install && E2E_BASE_URL=http://localhost:5173 npm test
```

`E2E_BASE_URL` defaults to `http://localhost:4173` (`npm run preview`).
Set `CHROMIUM_PATH` to use an already-installed Chromium.
