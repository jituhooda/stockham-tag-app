# API

Base path `/api/v1`. Interactive docs at `/api/docs` on a running backend.
The contract is in [`api/openapi.yaml`](../api/openapi.yaml) (also `.json`),
and [`api/postman-collection.json`](../api/postman-collection.json) imports
into Postman (set `baseUrl` and, in token mode, `token`).

## Endpoints

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| GET | `/health/live`, `/health/ready` | — | probes |
| GET | `/config` | — | branding, features, auth mode |
| GET | `/me` | signed in | user, role, permissions |
| GET | `/master/{employees,materials,equipment,expenses,trades,issues}` | `master:read` | reference lists (from eMachine) |
| GET | `/master/jobs?division=DFH` | `master:read` | jobs for divisions |
| GET | `/master/division?employee=Sean` | `master:read` | an employee's divisions |
| GET | `/tags` | `tags:read` | all tags (local + eMachine), newest first, with counts |
| POST | `/tags` | `tags:write` | create a draft |
| GET | `/tags/{id}` | `tags:read` | full tag |
| PUT | `/tags/{id}` | `tags:write` | replace content (imports an `e…` tag; response has the new id) |
| POST | `/tags/{id}/submit` | `tags:submit` | sign in person or send for signature |
| POST | `/tags/{id}/approve`, `/reject` | `tags:decide` | decision on a submitted/signed tag |
| DELETE | `/tags/{id}` | `tags:delete` | delete a draft/rejected local tag |
| POST | `/tags/{id}/attachments` | `tags:write` | multipart upload (`file`) |
| GET | `/attachments/{id}` | `tags:read` | download |
| DELETE | `/tags/{id}/attachments/{attachmentId}` | `tags:write` | delete |
| GET/POST | `/approvers` | `tags:read` / `approvers:write` | approvers per customer |

## Tag ids

`"12"` is a tag in this app's database. `"e9001"` is a tag that exists only in
eMachine (Id 9001). Writing to an `e…` id copies the tag in first; afterwards
both ids resolve to the local copy.

## Errors

Every error has the same shape:

```json
{ "detail": "The tag can't be submitted yet",
  "problems": ["Select a job on the Details tab", "Add at least one cost line"],
  "requestId": "4f1c…" }
```

| Status | Meaning |
| --- | --- |
| 401 | no / bad token (token mode) |
| 403 | role lacks the permission |
| 404 | tag or attachment not found |
| 409 | tag is locked, or the action doesn't fit its status |
| 422 | invalid input, or the tag isn't complete enough to submit |
| 502 | eMachine unavailable |

## Example

```bash
curl -s localhost:8000/api/v1/tags -H 'Content-Type: application/json' -d '{
  "jobNo": "25033", "jobName": "Dragoneer 1 Letterman", "description": "Add door",
  "labor": [{"employeeName": "Jacob S Adams", "trade": "Framing", "regular": 7}],
  "expenses": [{"description": "Parking", "amount": 35}]
}'
```
