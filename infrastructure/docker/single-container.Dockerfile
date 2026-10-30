# One image that serves both the web app and the API (no nginx) - handy for a
# small VM or a PaaS. Build from the repository root:
#   docker build -f infrastructure/docker/single-container.Dockerfile -t stockham-tags .
FROM node:22-alpine AS web
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 UV_PROJECT_ENVIRONMENT=/opt/venv UV_COMPILE_BYTECODE=1
COPY --from=ghcr.io/astral-sh/uv:0.8.4 /uv /usr/local/bin/uv
WORKDIR /app/backend
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY backend/apexapp ./apexapp
COPY config /app/config
COPY database/migrations /app/database/migrations
COPY database/fixtures /app/database/fixtures
COPY --from=web /app/dist /app/static
RUN useradd --system --uid 10001 app && mkdir -p /data && chown app /data
USER app
ENV PATH="/opt/venv/bin:$PATH" CONFIG_DIR=/app/config STATIC_DIR=/app/static \
    DATABASE_URL=sqlite:////data/stockham-tags.db ATTACHMENTS_DIR=/data/attachments
VOLUME ["/data"]
EXPOSE 8000
CMD ["uvicorn", "apexapp.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips=*"]
