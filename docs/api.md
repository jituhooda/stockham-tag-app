# eMachine API

The app talks only to eMachine. The contract it relies on is in
[`api/openapi.yaml`](../api/openapi.yaml), documented from requests captured in
the existing eMachine Tags app.

## Reads

`GET /datamodel/api/model_query?query=<base64 of the SQL>` with
`Authorization: Bearer <token>`. Queries (all in `config/integrations.config.json`):

| Name | Purpose |
| --- | --- |
| `tags` | Tag list with line counts (newest first) |
| `tag` | One tag's header by `Id` |
| `tagLabor`, `tagMaterials`, `tagEquipment`, `tagExpenses` | A tag's cost lines (with master descriptions) |
| `employees`, `trades`, `materials`, `equipment`, `expenses` | Pickers |
| `division`, `jobs` | Your division, and that division's jobs |
| `jobDetails` | A job's customer id, PM email and address (when a tag is started) |

Parameters are inserted safely: ids must be integers, text is quoted and escaped.

## Adding a tag: Autodesk Forma check

Tapping ✓ in the Add Tag dialog runs `jobDetails`, `trades` and then:

`GET https://developer.api.autodesk.com/construction/admin/v1/accounts/{accountId}/projects?filter[jobNumber]=<job no>`
with `Authorization: Bearer <Forma token>` (called straight from the browser; Autodesk allows it).
The tag form opens only if `results` is non-empty; otherwise the app shows
"Could not find project <job no> in Autodesk Forma. Contact the Office." and returns to the list.
A rejected or missing token is an error message, never "no project". Settings: `forma` in
`config/integrations.config.json` and `VITE_FORMA_TOKEN` in `frontend/.env.local`. The token is
short-lived (about an hour) and, like any `VITE_*` value, visible to anyone who loads the site.

## Writes

`POST /datamodel/api/<table>`, `Content-Type: application/x-www-form-urlencoded`.

| Table | Insert (no `Id`) | Update (`Id=…`) |
| --- | --- | --- |
| `tags` | `status, description, tag_date, IsPremium, JobNo, JobName, CustomerID, PMEmail, JobAddress, tag_number` (best guess, not captured) | `status, description, tag_date, IsPremium, JobNo, JobName, CustomerID, PMEmail, JobAddress` (changed ones only) |
| `tag_labor` | `tag_id, employee_id, employee_name, trade_id, regularhours, overtime, doubletime` | changed fields |
| `tag_materials` | `tag_id, material_id, qty, length` | changed fields |
| `tag_equipment` | `tag_id, equipment_id, qty` (inferred) | changed fields |
| `tag_other_expenses` | `tag_id, expenses_id, qty` (**qty holds the amount**) | changed fields |

Only fields listed under `writes` in `config/integrations.config.json` can ever
be sent. To see exactly what a save would send without sending it, keep
read-only mode on and check the browser console after pressing Save.

## Still to capture

For each, a "Copy as cURL" from the existing app plus the response:
creating a tag (and the response with its new Id), deleting a line, adding
equipment, uploading a file, selecting an issue, and submitting a signature.
