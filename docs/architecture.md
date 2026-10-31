# Architecture

Stockham Tags is a **frontend-only** web app. There is no backend and no
database of its own: the browser reads and writes eMachine directly.

```
 Phone / tablet / desktop browser
            │
            ▼
 ┌──────────────────────────────┐   /datamodel/*   ┌──────────────────────────┐
 │ nginx (or the Vite dev server)│ ───────────────▶ │ eMachine                 │
 │ serves the React app          │   same-origin    │ model_query (read)       │
 └──────────────────────────────┘     proxy        │ /datamodel/api/<table>   │
                                                    │ (insert / update)        │
                                                    └──────────────────────────┘
```

- **Reads:** `GET /datamodel/api/model_query?query=<base64 SQL>`. Every query is
  in `config/integrations.config.json`.
- **Writes:** `POST /datamodel/api/<table>` with form fields. With `Id` the row is
  updated (only the changed fields are sent); without `Id` a row is inserted
  (cost lines also send `tag_id`).
- **Proxy:** by default the app calls `/datamodel/...` on its own origin and
  nginx forwards it to eMachine, so browsers never need eMachine to allow CORS.
  Set `VITE_EMACHINE_BASE_URL` to call eMachine directly instead.
- **Auth:** each request carries the user's eMachine bearer token (pasted on the
  sign-in screen, or built in with `VITE_EMACHINE_TOKEN`).

## What saves to eMachine today

| Area | Status |
| --- | --- |
| Tag list, tag details, all four cost lists | Read from eMachine |
| Edit tag details (description, date, premium, job, PM email, address) | Saves (update `tags`) |
| Add labor / material / equipment / expense lines | Saves (insert with `tag_id`) |
| Change existing lines | Saves (update by `Id`, changed fields only) |
| Remove a saved line | Trash → "Are you sure to delete?" → `delete from <table> where Id=…` through `model_query` |
| Create a new tag | Add Tag → pick a job → fill in Details and save. The inserts match a save captured from the existing app: tag first, then its lines. With saving off, the requests are only logged to the console |
| Files | List `tag_photos`; add (phone picker, photo editor, upload through eMachine's cloud storage → Dropbox, then `tag_photos`); delete the link |
| Issues, Sign/Submit | **Not connected**: APIs not captured; screens explain this |

`tag_equipment` saves use field names inferred from the equipment read query
(`equipment_id`, `qty`); confirm them with one captured save.

## Safety: read-only mode

Saving is **off unless `VITE_EMACHINE_WRITES=true`** at build time. While off,
Save logs the exact requests it would send to the browser console and sends
nothing. Tests always use a mock eMachine (`tests/e2e/helpers.mjs`) at
`https://emachine.invalid`, so they can never touch real data.

## Code layout (`frontend/`)

| Folder | Purpose |
| --- | --- |
| `App.jsx`, `main.jsx` | Providers and the sign-in gate |
| `lib/apexHttp.js` | eMachine client: base64 queries, form writes, read-only guard, token |
| `lib/apexApi.js` | Tags and master data: row mapping and the save plan (`planSave`) |
| `lib/apexConfig.js` | `config/*.json` + `VITE_*` settings |
| `routes/`, `layouts/` | URLs (`/tags/:id/:tab/:sub?`) and the phone / tablet / desktop shell |
| `pages/`, `pages/tabs/` | List, detail, and the Details / Cost / Files / Issues / Sign tabs |
| `components/` | Shared widgets, icons, menu, "not connected" notice |
| `hooks/` | Master-data cache, tag editor, layout, unsaved-changes guard |
| `state/` | Signed-in user and device settings; the tag list |
| `services/` | Field helpers, tag shape, validation, image helpers |

## Responsive layout

| Device | Viewport | Layout |
| --- | --- | --- |
| Phone | narrower than 768px | One screen at a time, as in the mockups |
| Phone on its side | shorter than 500px | One screen; compact header; tabs and Save pinned |
| Tablet | 768–1199px | Tag list (320px) beside the open tag |
| Desktop | 1200px+ | Wider list; Details four fields to a row; cost lines two to a row |
