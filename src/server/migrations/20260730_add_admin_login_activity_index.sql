CREATE INDEX IF NOT EXISTS idx_activity_login_retention
  ON activity_log(event_type, created_at DESC);
