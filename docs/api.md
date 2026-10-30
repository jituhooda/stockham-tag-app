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
The tag form opens either way. If `results` is empty the new tag page shows a warning,
"Could not find project <job no> in Autodesk Forma. Contact the Office.", and OK leaves the user there to
create the tag. A rejected or missing token or a network failure shows its own message in the same way. Settings: `forma` in
`config/integrations.config.json`.

The Autodesk token is short-lived (about an hour). The app gets it on demand from `forma.tokenUrl`
(`GET https://stockham.emachine.ai/stockham/token`, public, returns `{ access_token, expires_at }` with
`expires_at` in epoch seconds), keeps it in memory until a minute before it expires, and fetches a new one
(retrying the lookup once) if Autodesk rejects it. Nothing is stored on disk or in `.env` files.

## Writes

`POST /datamodel/api/<table>`, `Content-Type: application/x-www-form-urlencoded`.

| Table | Insert (no `Id`) | Update (`Id=…`) |
| --- | --- | --- |
| `tags` | `CreatedById, tag_number (may be blank), description, status, tag_date, JobName, CustomerID, PMEmail, JobNo, JobAddress`, plus `IsPremium` only when set | `status, description, tag_date, IsPremium, JobNo, JobName, CustomerID, PMEmail, JobAddress` (changed ones only) |
| `tag_labor` | `tag_id, employee_id, employee_name, trade_id, regularhours, overtime, doubletime` | changed fields |
| `tag_materials` | `tag_id, material_id, qty, length` | changed fields |
| `tag_equipment` | `tag_id, equipment_id, qty` | changed fields |
| `tag_other_expenses` | `tag_id, expenses_id, expenses_description (the expense type's name), qty` (**qty holds the amount**) | changed fields |

Every write also sends the header `eml-service: True`, as the existing app does.

**Saving a new tag** (field lists above are from a save captured from the existing app): the tag is
inserted first (no `Id`); the new `Id` is read from the response, or, if the response has none, with
`SELECT MAX(Id) … WHERE JobNo = … AND CreatedById = …` (`newTagId` query); then the labor, material,
equipment and expense lines are inserted with that `tag_id`. The existing app sends the lines first and the
tag last, using a `tag_id` it knew in advance; how it gets that Id wasn't captured, so this app inserts the
tag first. Tell us if eMachine does something on the tag insert that must come after the lines.
`CreatedById` is the display name from the Created By field (employee name from the menu, else the token's
name/email). `CustomerID`, `PMEmail` and `JobAddress` are the job's own values from the `job` table.

Only fields listed under `writes` in `config/integrations.config.json` can ever
be sent. To see exactly what a save would send without sending it, keep
read-only mode on and check the browser console after pressing Save.

## Deleting a cost line

The trash icon asks "Are you sure to delete?" (✗ / ✓). On ✓ a saved line is deleted right away, as in the
existing app, with a `model_query` GET whose SQL is `delete from <table> where Id='<line Id>'`
(`deleteLine` in `config/integrations.config.json`; header `eml-service: True`). All four were captured from the existing app and are
sent byte for byte (base64 without `=` padding). The table is picked from the
app's own list (`tag_labor`, `tag_materials`, `tag_equipment`, `tag_other_expenses`) and the Id must be a plain
integer. A line that was never saved is just removed from the screen; no request is sent. If eMachine returns
an error the line stays. Deleting a whole tag isn't implemented (no request captured).

## Adding a new material or equipment to the list

The "+" next to a material's Description opens "Add New Material" (Description text, Type = one of the trades
from the `trades` list). On ✓ the app sends `POST /datamodel/api/materials_master` with
`description=<name>&CostCodeID=<trade Id>` (header `eml-service: True`), then reloads the list with
`select * from materials_master` and selects the new item on that line. The Id is taken from the response if
there is one; otherwise it is found in the reloaded list by name. If the name already exists, nothing is
created and the existing item is selected. Equipment works the same way: the "+" opens "Equipment Name" and sends
`POST /datamodel/api/equipment_master` with `description=<name>`, then reloads with
`select * from equipment_master`. Expenses has no "+" yet; it would need its own capture.

## Still to capture

For each, a "Copy as cURL" from the existing app plus the response:
the response of the new-tag insert (does it return the Id?), deleting a whole tag, uploading a
file, selecting an issue, and submitting a signature.
