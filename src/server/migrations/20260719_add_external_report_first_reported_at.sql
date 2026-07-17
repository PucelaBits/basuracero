BEGIN;

ALTER TABLE external_report_imports
  ADD COLUMN first_reported_at DATETIME;

CREATE INDEX IF NOT EXISTS idx_external_report_imports_first_reported_at
  ON external_report_imports(channel, incidencia_id, first_reported_at);

COMMIT;
