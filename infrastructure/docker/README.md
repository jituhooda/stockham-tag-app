# Docker images

| Image | Dockerfile | Serves |
| --- | --- | --- |
| backend | `backend/Dockerfile` | API on :8000, data in the `/data` volume |
| frontend | `frontend/Dockerfile` | nginx on :8080: the web app, `/api` proxied to `backend:8000` |
| all-in-one | `infrastructure/docker/single-container.Dockerfile` | web app and API from one process on :8000 |

All images build from the **repository root** because they need `config/`,
`database/migrations` and `infrastructure/nginx`.

```bash
docker compose up -d --build                                              # SQLite
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d      # PostgreSQL
docker compose -f docker-compose.yml -f docker-compose.dev.yml up         # hot reload
```

Both runtime images run as a non-root user and define health checks.
