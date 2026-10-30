-- 0002 reference data (all dialects)

INSERT INTO tag_statuses (code, label, editable, sort_order) VALUES ('Draft', 'Draft', TRUE, 10);
INSERT INTO tag_statuses (code, label, editable, sort_order) VALUES ('Submitted', 'Submitted', FALSE, 20);
INSERT INTO tag_statuses (code, label, editable, sort_order) VALUES ('Signed', 'Signed', FALSE, 30);
INSERT INTO tag_statuses (code, label, editable, sort_order) VALUES ('Approved', 'Approved', FALSE, 40);
INSERT INTO tag_statuses (code, label, editable, sort_order) VALUES ('Rejected', 'Rejected', TRUE, 50);
