# Docker image

`frontend/Dockerfile` builds the web app (Node) and serves it with nginx on
port 8080. nginx also forwards `/datamodel/` to eMachine, so the browser only
talks to this site. There is no backend container and no database.

Build from the repository root (the build needs `config/` and `infrastructure/nginx`):

```bash
docker compose up -d --build                                        # http://localhost:8080, read-only
VITE_EMACHINE_WRITES=true docker compose up -d --build              # saving to eMachine enabled
docker compose -f docker-compose.yml -f docker-compose.dev.yml up   # hot reload on :5173
```
