# Build context: the repository root (see docker-compose.yml), because the
# runtime image uses infrastructure/nginx/nginx.conf.
FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
COPY config /config
ARG VITE_EMACHINE_BASE_URL=
ARG VITE_EMACHINE_WRITES=false
ENV VITE_EMACHINE_BASE_URL=$VITE_EMACHINE_BASE_URL VITE_EMACHINE_WRITES=$VITE_EMACHINE_WRITES
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY infrastructure/nginx/nginx.conf /etc/nginx/nginx.conf
COPY infrastructure/nginx/security-headers.conf /etc/nginx/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
