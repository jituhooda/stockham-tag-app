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

Parameters are inserted safely: ids must be integers, text is quoted and escaped.

## Writes

`POST /datamodel/api/<table>`, `Content-Type: application/x-www-form-urlencoded`.

| Table | Insert (no `Id`) | Update (`Id=…`) |
| --- | --- | --- |
| `tags` | not connected yet | `status, description, tag_date, IsPremium, JobNo, JobName, CustomerID, PMEmail, JobAddress` (changed ones only) |
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
