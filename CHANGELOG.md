# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed
- **Frontend-only.** Removed the FastAPI backend, the SQLite/PostgreSQL database,
  migrations and database tooling. The browser now reads and saves eMachine
  directly (`model_query` for reads, `POST /datamodel/api/<table>` for saves),
  through a same-origin `/datamodel` proxy in nginx and the Vite dev server.
- Saves send only what changed, in the format captured from the existing
  eMachine app; cost lines store master-record ids (employee, trade, material,
  equipment, expense type). Trades come from eMachine's `trade` table.
- Sign-in uses the user's eMachine access token.

### Added
- Read-only mode, on by default (`VITE_EMACHINE_WRITES`): Save logs the requests
  it would send and sends nothing.
- Browser tests against a mock eMachine that check the exact save requests.

### Disabled until their eMachine APIs are known
- Creating tags, removing saved lines, files, issues, and sign/submit.

- GitHub Actions CI (`.github/workflows/ci.yml`): export validation, frontend
  tests and build, browser tests against the mock eMachine, Docker image build.

### Changed
- Layout now follows the device: phones show one screen at a time (and stay
  usable on their side), tablets from 768px keep the tag list beside the open
  tag, and desktops from 1200px get a wider list and multi-column forms. Grids
  size to their pane with container queries. On tablet and desktop the open tag
  has a close button and no duplicate menu.

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
