-- Optional sample data for local development (portable SQL; run after migrations).
--   scripts/db-migrate.sh --seed
-- Do not load into production.

INSERT INTO approvers (customer, name, email, created_at) VALUES ('Principal Builders', 'Sean Hubert', 'sean.hubert@example.com', CURRENT_TIMESTAMP);
INSERT INTO approvers (customer, name, email, created_at) VALUES ('Northbay General', 'Dana Wills', 'dana.wills@example.com', CURRENT_TIMESTAMP);
