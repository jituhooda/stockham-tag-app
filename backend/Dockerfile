# Build context: the repository root (see docker-compose.yml), because the
# backend also needs config/ and database/migrations at runtime.
FROM python:3.13-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PROJECT_ENVIRONMENT=/opt/venv
COPY --from=ghcr.io/astral-sh/uv:0.8.4 /uv /usr/local/bin/uv
WORKDIR /app/backend

FROM base AS deps
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

FROM base AS runtime
RUN useradd --system --uid 10001 --home /app app \
 && apt-get update && apt-get install -y --no-install-recommends curl postgresql-client sqlite3 \
 && rm -rf /var/lib/apt/lists/*
COPY --from=deps /opt/venv /opt/venv
COPY backend/apexapp ./apexapp
COPY config /app/config
COPY database/migrations /app/database/migrations
COPY database/fixtures /app/database/fixtures
ENV PATH="/opt/venv/bin:$PATH" \
    CONFIG_DIR=/app/config \
    DATABASE_URL=sqlite:////data/stockham-tags.db \
    ATTACHMENTS_DIR=/data/attachments
RUN mkdir -p /data && chown app /data
USER app
VOLUME ["/data"]
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD curl -fsS http://localhost:8000/health/live || exit 1
CMD ["uvicorn", "apexapp.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips=*"]
