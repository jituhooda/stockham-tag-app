# End-to-end tests

Browser tests against the built web app. **They never contact eMachine**: the
app is built to call `https://emachine.invalid`, and `helpers.mjs` answers those
requests from `fixtures/` and records every save so tests can check exactly what
would be sent. Any other outside request is blocked.

```bash
cd frontend
VITE_EMACHINE_BASE_URL=https://emachine.invalid VITE_EMACHINE_TOKEN=e2e VITE_EMACHINE_WRITES=true npm run build
npx vite preview --port 4173 &
cd ../tests/e2e && npm install && npm test
```

`E2E_BASE_URL` defaults to `http://localhost:4173`. Set `CHROMIUM_PATH` to use an
already-installed Chromium.
