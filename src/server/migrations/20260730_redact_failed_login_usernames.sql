UPDATE activity_log
SET metadata_json = json_remove(metadata_json, '$.username')
WHERE event_type = 'admin_login_failed'
  AND json_valid(metadata_json);
