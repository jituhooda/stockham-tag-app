# Monitoring

- **Health:** `GET /health/live` (process up) and `GET /health/ready` (database
  reachable, schema version, eMachine mode). Docker and Kubernetes probes use these.
- **Metrics:** `GET /metrics` (Prometheus text): `stockham_http_requests_total`
  and `stockham_http_request_duration_seconds` by method, route template and status.
  Restrict access to it at your proxy or network edge; nginx does not forward it.
- **Logs:** one line per event on stdout; set `LOG_FORMAT=json` for log
  shippers. Every line and every response carries the request id (`X-Request-ID`).

Files here: `prometheus.yml` (scrape config), `alerts.yml` (API down, error
rate, eMachine unreachable, slow responses), and a starter Grafana dashboard.
`docker-compose.prod.yml` starts Prometheus with the `monitoring` profile.
