# Seeds

Reference data every environment needs (tag statuses) is created by migration
`0002_reference_data.sql`, not here.

`dev-sample.sql` adds a few example approvers for local development. Load it
with `scripts/db-migrate.sh --seed`. It is never loaded automatically.
