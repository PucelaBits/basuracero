const { run } = require('./dbAsync');

const ACTIVITY_ACTORS = new Set(['system', 'citizen', 'admin']);

async function recordActivity({ eventType, eventGroup, actorType = 'system', actorRole = null, adminUserId = null, incidenciaId = null, metadata = null }) {
  if (!ACTIVITY_ACTORS.has(actorType)) {
    throw new Error('Origen de actividad no soportado.');
  }

  await run(
    `INSERT INTO activity_log (
      event_type, event_group, actor_type, actor_role, admin_user_id, incidencia_id, metadata_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
    [
      eventType,
      eventGroup,
      actorType,
      actorRole,
      adminUserId || null,
      incidenciaId || null,
      metadata ? JSON.stringify(metadata) : null
    ]
  );
}

module.exports = { recordActivity };
