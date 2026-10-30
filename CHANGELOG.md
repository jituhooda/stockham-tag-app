# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- GitHub Actions CI (`.github/workflows/ci.yml`): export validation, backend and
  cross-cutting tests on SQLite and PostgreSQL, frontend tests and build,
  browser end-to-end tests, Docker image builds with an API smoke test.

## [1.0.0] - 2026-10-30

### Added
- Responsive web app (phone, tablet, desktop) for change-order tags: tag list
  with search and status filter; Details, Cost (Labor, Material, Expenses,
  Equipment), Files, Issues and Sign tabs; signature pad; send-for-signature email draft.
- FastAPI backend that stores tags, cost lines, issues, signatures, approvers
  and attachments in SQLite or PostgreSQL, and reads reference data and
  existing tags from eMachine with the token kept server-side.
- Tag lifecycle Draft → Signed/Submitted → Approved/Rejected with server-side validation.
- Token authentication with viewer / editor / approver / admin roles.
- Plain-SQL migrations for both databases, data transfer between them, backup and restore.
- Canonical data model, OpenAPI contract, Postman collection.
- Docker images, Compose files (dev, prod), nginx config, Kubernetes manifests,
  Prometheus metrics and alerts.
- Test suites: backend unit, integration, API contract, security, database
  portability (SQLite and PostgreSQL), frontend unit, browser end-to-end.

### Changed
- Replaces the earlier browser-only prototype, which called eMachine directly
  and kept edits in `localStorage`.
