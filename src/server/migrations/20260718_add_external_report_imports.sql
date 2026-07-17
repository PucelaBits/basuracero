BEGIN;

CREATE TABLE IF NOT EXISTS external_report_imports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  incidencia_id INTEGER NOT NULL,
  channel TEXT NOT NULL,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  total INTEGER NOT NULL CHECK (total >= 0),
  imported_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (incidencia_id) REFERENCES incidencias(id) ON DELETE CASCADE,
  UNIQUE (incidencia_id, channel, event_type, source)
);

CREATE INDEX IF NOT EXISTS idx_external_report_imports_ranking
  ON external_report_imports(channel, incidencia_id);

COMMIT;
