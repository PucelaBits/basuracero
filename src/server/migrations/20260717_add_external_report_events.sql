BEGIN;

CREATE TABLE IF NOT EXISTS external_report_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  incidencia_id INTEGER NOT NULL,
  channel TEXT NOT NULL,
  event_type TEXT NOT NULL,
  reporter_fingerprint TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (incidencia_id) REFERENCES incidencias(id) ON DELETE CASCADE,
  UNIQUE (incidencia_id, reporter_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_external_report_events_ranking
  ON external_report_events(channel, incidencia_id);

COMMIT;
