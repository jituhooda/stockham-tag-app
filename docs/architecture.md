# Architecture

```
 Phone / tablet / desktop browser
            │  HTTPS
            ▼
 ┌──────────────────────┐      /api/*       ┌──────────────────────────┐   base64 SQL + Bearer   ┌────────────┐
 │ nginx (frontend)     │ ───────────────▶  │ FastAPI (backend)        │ ──────────────────────▶ │  eMachine  │
 │ React SPA, :8080     │                   │ apexapp, :8000           │   reference data, tags  │  model_query│
 └──────────────────────┘                   │                          │ ◀────────────────────── └────────────┘
                                            │  SQLAlchemy Core         │
                                            └──────┬─────────────┬─────┘
                                                   ▼             ▼
                                        SQLite / PostgreSQL   /data/attachments
```

## Responsibilities

| Part | Owns |
| --- | --- |
| **eMachine** | Employees, jobs, materials, equipment, expense types, labor rates, and tags created in eMachine. Read-only from this app. |
| **Backend** | Tags created or edited here, their cost lines, issues, signatures, approvers and attachments; validation and the tag lifecycle; access control; the eMachine token. |
| **Frontend** | Screens, form state, offline-friendly UX (images are downscaled before upload), layout for phone/tablet/desktop. Holds no secrets. |

## Tag lifecycle

```
            save                     sign in person
  (new) ──────────▶ Draft ─────────────────────────────▶ Signed ──┐
                     │  ▲     send for signature                  │ approve
                     │  └──── Submitted ◀───────────────          ├────────▶ Approved
                     │            │                               │
                     │            └──────────── reject ──────────▶ Rejected ──▶ (edit, submit again)
```

Draft and Rejected tags are editable; everything else is locked.

### eMachine tags

The tag list merges this app's tags with tags read from eMachine (`id`
`e<Id>`). Opening one shows eMachine's data and lines. The first save, upload or
submit copies it into the local database (`tags.external_id` keeps the link),
after which the local copy is shown instead. eMachine is never written to.

## Backend layout (`backend/apexapp`)

| Module | Purpose |
| --- | --- |
| `main.py` | App factory: middleware, error handlers, routers, startup migrations |
| `config.py` | Loads `config/*.json`, applies environment overrides |
| `auth.py`, `rbac.py` | Who is calling; what their role may do |
| `api/routes/*` | HTTP layer only: parse, authorise, call a service |
| `services/*` | Business rules: tag lifecycle, validation, master data, attachments |
| `repositories/*`, `crud.py` | SQL via SQLAlchemy Core |
| `schema.py` | Table definitions (mirrors `database/migrations`) |
| `integrations/emachine*.py` | eMachine client (base64 queries, caching, fixtures) and row mapping |
| `database/*` | Engine adapters, migration runner, checks, backup, transfer |
| `middleware/*` | Request ids, security headers, metrics |
| `jobs/*` | Cache warm-up, orphaned-file cleanup |

## Frontend layout (`frontend/`)

| Folder | Purpose |
| --- | --- |
| `App.jsx`, `main.jsx` | Providers and the sign-in gate |
| `routes/` | URL scheme: `/tags/:id/:tab/:sub?` |
| `layouts/` | Shell: one pane on phones; list beside the open tag on tablets and desktops (`hooks/useLayout.js`) |
| `pages/`, `pages/tabs/` | List, detail, and the Details / Cost / Files / Issues / Sign tabs |
| `components/` | `ui.jsx` (shared widgets), `icons.jsx`, menu drawer |
| `hooks/` | Master data cache, tag editor state, unsaved-changes guard |
| `state/` | App config + user + device settings; tag list |
| `services/` | Validation, form ↔ API conversion, image compression |
| `lib/` | `apexConfig`, `apexHttp` (fetch wrapper), `apexApi` (endpoint map) |

## Responsive layout

| Device | Viewport | Layout |
| --- | --- | --- |
| Phone | narrower than 768px | One screen at a time, as in the mockups. Back arrow returns to the list. |
| Phone on its side | shorter than 500px | Still one screen; header, tabs and Save bar shrink, tabs and Save stay pinned while the form scrolls. |
| Tablet | 768–1199px | Tag list (320px) on the left, open tag on the right; ✕ closes the tag. |
| Desktop | 1200px+ | Wider list (400–460px); Details fields four to a row, cost lines two to a row. |

`hooks/useLayout.js` picks the layout with `matchMedia`; the shell gets
`data-layout="phone|tablet|desktop"`. Inside each pane, CSS container queries
size grids to the pane rather than the window, so the tag list shows 1–3
columns depending on how much room it has. `tests/e2e/layout.test.mjs` checks
each size.
