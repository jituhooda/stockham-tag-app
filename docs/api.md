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

## Files (attachments)

**List:** `SELECT tp.Id, tp.photo_url, tp.description, tp.uploaded_at FROM tag_photos tp WHERE tp.tag_id = <id>`
(`tagPhotos` in `config/integrations.config.json`). Photos show as thumbnails; audio, video and documents show an icon.
Tapping a file opens its link.

**Add (the "+" → Photos & Videos / Audio / Documents):** the phone's own picker opens. A picked **photo** first opens the
editor (crop by dragging the box or its handles, flip left-right / top-bottom, rotate 90°; Cancel / Done). Then:

1. `POST /cloudproviders/app/cloud_storage/upload`, `multipart/form-data`, fields in this order:
   `path` = `/Stockham/prod/<appId>/<user email>/Misc`, `provider_name` = `SupportEmachine-Dropbox`,
   `customer_name` = `Basic`, then `file`. (`uploads` in `config/integrations.config.json`.) eMachine stores the file
   in Dropbox and returns its link.
2. `POST /datamodel/api/tag_photos` with `tag_id`, `photo_url` (the returned link) and `description` (the file name).
3. The list is read again.

No Dropbox key or token is used by the app: the upload goes through eMachine with the user's own eMachine token, as the
existing app does. Edited photos are re-encoded as JPEG (long side at most `uploads.image.maxPixels`, quality
`uploads.image.quality`); an untouched JPEG is sent exactly as picked. Files over `uploads.maxFileMb` (25) are refused.
Files can only be added to a **saved** tag. **Delete:** trash → "Are you sure to delete?" →
`delete from tag_photos where Id='<id>'`; this removes the link from the tag only (the file stays in Dropbox).

**To confirm:** the `<appId>` GUID in the path was copied from one captured upload, and the upload response was not
captured. The app takes the first Dropbox link anywhere in the response, and refuses to attach if there isn't one.

## Issues

The Issues tab links Autodesk Forma issues to the tag.

- **Choices (the dropdown):** the job's Forma project is found with `GET …/accounts/{accountId}/projects?filter[jobNumber]=<job no>`,
  then its issues with `GET …/construction/issues/v1/projects/{projectId}/issues?filter[status]=open,in_progress&fields=id,displayId,title,description&limit=200`
  (more pages are read if there are more than 200). Both are called straight from the browser with the Autodesk token from `forma.tokenUrl`
  (see "Adding a tag: Autodesk Forma check"). Each choice reads `<displayId> : <description>`, e.g. "5 : Room has been completely dropped and punched".
  The list is kept for the session.
- **Saved issues:** `select * from tag_issues where tag_id = '<id>'` (`tagIssues`). A row is `Id`, `tag_id`, `issue_id` where `issue_id` is
  the Forma issue's id (a GUID). Labels come from the list above; an issue that is no longer open is looked up one by one
  (`…/issues/{issueId}`).
- **Selecting:** a pick is added to "Selected Issues" and saved with **Save**: `POST /datamodel/api/tag_issues` with `tag_id` and `issue_id`
  per new pick (header `eml-service: True`). Picking an issue that is already in the list (saved or not) shows "This issue is already added".
- **Removing:** the trash asks "Are you sure to delete?", then `delete from tag_issues where Id='<id>'` for a saved issue (same style as
  cost lines); a pick that was never saved is just removed.
- **Not captured:** the insert and delete above are inferred from the `tag_issues` table (three columns) and the other captured writes,
  not from a captured request. Check them once on a test tag. A job with no Forma project, or an unreachable Forma, shows a message and
  keeps the saved issues visible.

## Sign

- **Title:** "Approver from {customer name}". The name comes from the tag's customer (`customer` table, via the contacts query
  or `select CustomerName from customer where CustomerID = '<id>'`), so it changes with the tag.
- **Approver dropdown (captured):** the customer's contacts:
  `select CONCAT(cc.firstname, ' ', cc.lastname) AS fullname, cc.Id, cc.firstname, cc.lastname, cc.Email, cc.customerID, c.CustomerName
  FROM customercontact cc JOIN customer c ON cc.customerID = c.CustomerID WHERE cc.customerID = '<tag's CustomerID>'` (`approvers`).
  The list shows names, sorted; the chosen contact's name and email appear under the signature pad, and the email pre-fills
  "Send for signature". The choice and the drawn signature are not saved by **Save** and don't count as unsaved changes.
- **Signature on file (captured read):** `select * from tag_signature where tag_id='<id>'` (`tagSignature`) is read when the tab opens.
  Columns: `Id, tag_id, name, role, signature, CreatedDate, CreatedById, LastModifiedDate, LastModifiedById, description`. A tag that
  already has a row shows "Signed" with the name, role, date and, if the `signature` value is an image (data URL, link or base64
  PNG/JPEG/SVG), the picture. The table was empty when this was written, so the stored format is not confirmed.
- **"+" (inferred, not captured):** "Add New Approver" (first name, last name, email) sends `POST /datamodel/api/customercontact` with
  `FirstName`, `LastName`, `Email`, `CustomerID` (the table's four columns; header `eml-service: True`), reloads the contacts and
  selects the new one. An email that already exists is selected instead of added again.
- **Submit, sign in person (captured):** see below. **Send for signature** is still disabled: its request hasn't been captured.

## Submit

One request does everything downstream (the PDF, the Autodesk Cost change order and the emails), so the app doesn't call Autodesk
or the other calls in the existing app's save sequence (trade list, Forma project lookup, PCO, budgets, templates, cost-items,
list refresh). What the app does, in order:

1. Checks the tag (job, description, a cost line, approver, signature) and the document (`signedDocProblems`). Problems open the tab to fix.
2. Saves the tag with **Save** first when there are unsaved changes or the tag is new, so the document is made from what is stored.
3. Reads back (`tags.submitData`): the job (`select *, c.CustomerName from job j JOIN customer c ... where j.JobNo = '<job>'`),
   labor (grouped per person and trade; ST/OT/DT, or POT/PDT for OT/Premium tags), materials, equipment, other expenses, photo URLs
   and the Forma issue labels (`number : description`). The queries are `submit*` in `integrations.config.json`.
4. `POST https://emachine.instantar.io/proxyapi/api/https://stockham.emachine.ai/stockham/create-stockham-signed-doc` with a JSON body
   (header `instantarusername` = the signed-in user; no `Authorization`, as in the capture). Fields and order match
   `Body_Json_create-stockham-signed-doc.json`: `description, customer_name, customer_email, job_name, job_address, job_city_zip,
   tag_date, job_num, tag_num, pm_email, originator_email, signature_image_b64, signer_name, pm_name, issue_table, labor_table,
   material_table, equipment_table, expense_table, files_table`. Numbers are sent as text; the signature is bare base64 PNG.
5. Shows the result. The service replies with `doc_id`, `pdf_link` (the signed PDF), `sign_link` and an `autodesk` block. The app shows a
   "Submitted" popup with **Open signed document** (`pdf_link`, new tab) and **View in Autodesk** (`autodesk.web_view_url`), and keeps the same
   links in a "Signed document" card on the Sign tab for the rest of the browser session. `pdf_link` is a time-limited link, so the card hides
   it once its `Expires` time has passed. Only http(s) links are used.
6. Re-reads the tag. If it is still a draft (the service didn't change it) the app sets `Submitted`; if the service already did,
   the app writes nothing. The tag then opens read-only.

Assumptions to confirm with a real run: `pm_email` is the job's PM email (the sample used the originator's), `job_city_zip` is the
job's City, and the service (not the app) updates the tag's status/signature columns. Tested only against fakes, never live.

## Still to capture

For each, a "Copy as cURL" from the existing app plus the response:
the response of the new-tag insert (does it return the Id?), deleting a whole tag, the upload response,
saving and removing an issue, "Send for signature", and the response of the signed-document service.
