# Stockham Tags

Change-order tag management for Stockham Construction. It's one responsive web app that works on phones, tablets and desktop browsers, and it can be installed to a phone's home screen.

- **Phone**: one screen at a time (the tag list, then a tag), as in the original mobile design.
- **Tablet portrait**: the tag list shows in two columns.
- **Tablet landscape / desktop (≥1024px)**: the list stays on the left and the open tag fills the right.

## Features

| Screen | What it does |
| --- | --- |
| Tag list | Search by tag, job, description or address. Filter by status. Each card shows labor, material, equipment and expense counts. **Add Tag** starts a new draft. |
| Details | Job picker (searchable, from the `job` query for your division), tag #, date, description, PM email, address, premium time. |
| Cost | Four sections: **Labor** (employee, trade, regular/OT/DT hours), **Material** (description, qty, length), **Expenses** (type and amount, prefilled from the master row when it has one) and **Equipment** (description, qty). Every picker also accepts a value that isn't in the list. |
| Files | Add photos and documents, preview them, delete them. Photos are downscaled to 1600px before they're stored. |
| Issues | Link issues to the tag, from a query if one is configured, otherwise typed in. |
| Sign | Choose an approver for the job's customer, then either **sign in person** on the signature pad (status becomes *Signed*) or **send for signature** (status becomes *Submitted*, and an email draft opens). |

Submitting checks that the tag has a job, a description and at least one complete cost line. Tags that aren't Draft or Rejected are read-only. If you try to leave a tag with unsaved edits, the app asks first.

The hamburger menu sets **who you are**. That runs `select Division from employees where EMPLOYEE = '…'`, and the result decides which divisions' jobs are offered (DFH by default).

## Data

Every read goes through `GET /datamodel/api/model_query?query=<base64 SQL>` with a bearer token. The queries are in `src/api/queries.ts`. Besides the queries you supplied, the app also reads a tag's existing lines with `select * from tag_labor|tag_materials|tag_equipment|tag_other_expenses where tag_id = <Id>`. Those tables come from the tag-list query.

Column names are matched case-insensitively against a list of likely names (see `src/utils/fields.ts` and `src/store/mappers.ts`). If a field shows up blank, add the real column name to the relevant list there.

**Saving:** the API is read-only, so saved tags, attachments, issues and signatures are stored **on the device** (`localStorage`) and layered over the server data. `persistTag` in `src/store/TagsContext.tsx` is the single place to call a write endpoint once one exists.

## Running it

```bash
npm install
cp .env.example .env.local   # then put the API token in VITE_API_TOKEN
npm run dev                  # http://localhost:5173, also reachable from phones on the same network
```

`npm run build` writes a static site to `dist/`. `npm run preview` serves that build.

In dev and preview, Vite proxies `/datamodel/*` to `https://emachine.instantar.io`, so CORS doesn't get in the way. For production you have two options:

- Host `dist/` behind a reverse proxy that forwards `/datamodel/` to the API. This is the best option, because the proxy can also add the `Authorization` header so the token never reaches the browser.
- Set `VITE_API_URL` to the full API URL, if the API allows your site's origin.

> Anything in a `VITE_*` variable is compiled into the JavaScript the browser downloads. Treat a token placed there as visible to every user of the site.

| Variable | Purpose |
| --- | --- |
| `VITE_API_TOKEN` | Bearer token, without the `Bearer ` prefix |
| `VITE_API_URL` | Query endpoint (default `/datamodel/api/model_query`) |
| `VITE_ISSUES_QUERY` | Optional SQL returning the issues offered on the Issues tab |
