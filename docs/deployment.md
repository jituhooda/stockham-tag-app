# Deployment

## Option 1 — Docker Compose (recommended)

```bash
cp .env.example .env            # set EMACHINE_API_TOKEN, POSTGRES_PASSWORD, AUTH_MODE/AUTH_TOKENS
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
scripts/health-check.sh --url http://localhost:8000 --web http://localhost:8080
```

That starts PostgreSQL, the API and nginx (web app on `:8080`). Put your TLS
terminator or load balancer in front of `:8080`. Without the prod overlay the
stack uses SQLite in the `app-data` volume.

Add `--profile monitoring` to also run Prometheus on `:9090`.

## Option 2 — single container

```bash
docker build -f infrastructure/docker/single-container.Dockerfile -t stockham-tags .
docker run -d -p 8000:8000 -v stockham-data:/data -e EMACHINE_API_TOKEN=… stockham-tags
```

## Option 3 — Kubernetes

See [infrastructure/kubernetes/README.md](../infrastructure/kubernetes/README.md).

## Option 4 — without containers

```bash
scripts/setup.sh
cd frontend && npm run build                     # static files in frontend/dist
cd ../backend && STATIC_DIR=../frontend/dist uv run uvicorn apexapp.main:app --host 0.0.0.0 --port 8000
```

## Checklist

- [ ] `EMACHINE_API_TOKEN` set (server side only).
- [ ] `AUTH_MODE=token` with long random tokens in `AUTH_TOKENS`, **or** the app sits behind a proxy that authenticates users.
- [ ] PostgreSQL for more than one API replica.
- [ ] `/data` (attachments, SQLite) on persistent storage and backed up (`scripts/backup-db.sh` or the CronJob).
- [ ] HTTPS in front; enable HSTS in `infrastructure/nginx/security-headers.conf`.
- [ ] `CORS_ORIGINS` = the site's origin (only needed if the web app is on a different origin).
- [ ] `/metrics` not exposed publicly.
- [ ] Restore tested.

## Upgrades

Pull the new version, `docker compose … up -d --build`. The API applies
pending migrations at startup (Kubernetes: the init container). Take a backup
first.
