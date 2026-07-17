const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const { all, get, run } = require('../utils/dbAsync');
const { DEFAULT_TIPO_ICON, normalizeTipoIcon } = require('./iconCatalog');

const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_BYTES = 72;
const uploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, '..', '..', '..', 'uploads');
const DUMMY_PASSWORD_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.9wksZ1w1q1OReP4bIu4hB7F7Lr7oB4K';
const WHATSAPP_REPORT_TOTAL_SQL = `
  (SELECT COUNT(*)
   FROM external_report_events ere
   WHERE ere.incidencia_id = i.id AND ere.channel = 'whatsapp')
  + COALESCE((SELECT SUM(eri.total)
              FROM external_report_imports eri
              WHERE eri.incidencia_id = i.id AND eri.channel = 'whatsapp'), 0)`;

function normalizeFlag(value) {
  return value ? 1 : 0;
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`);
  }
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
    throw new Error(`La contraseña no puede superar ${PASSWORD_MAX_BYTES} bytes.`);
  }
}

function normalizeUsername(username) {
  const value = String(username || '').trim();
  if (!/^[A-Za-z0-9._-]{3,64}$/.test(value)) {
    throw new Error('El usuario debe tener entre 3 y 64 caracteres y solo puede incluir letras, numeros, punto, guion y guion bajo.');
  }
  return value;
}

function normalizeEditableDate(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    throw new Error('La fecha es obligatoria.');
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return `${raw} 00:00:00`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('La fecha no es valida.');
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day} 00:00:00`;
}

async function deleteImageFile(filename) {
  if (!filename) {
    return;
  }

  const safeFilename = path.basename(String(filename));
  if (safeFilename !== filename || safeFilename === '.' || safeFilename === '..') {
    throw new Error('Ruta de imagen no valida.');
  }
  const filePath = path.join(uploadsDir, safeFilename);
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

function getGeocodingUserAgent() {
  const appName = process.env.APP_NAME || 'BasuraCeroApp';
  let contactEmail = 'app@example.com';

  try {
    const socialLinks = process.env.APP_SOCIAL_LINKS;
    if (socialLinks) {
      const emailMatch = socialLinks.match(/mailto:(.*?)"/);
      if (emailMatch && emailMatch[1]) {
        contactEmail = emailMatch[1];
      }
    }
  } catch (_error) {
    // Fallback silencioso: ya tenemos un user-agent por defecto.
  }

  return `${appName}/1.0 (${contactEmail})`;
}

async function reverseGeocodeLocation(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=es`;
  const response = await axios.get(url, {
    headers: {
      'User-Agent': getGeocodingUserAgent()
    }
  });
  const data = response.data || {};
  const address = data.address || {};

  return {
    direccion: data.display_name || '',
    barrio: address.suburb || address.neighbourhood || address.city || address.town || address.hamlet || address.village || '',
    direccion_json: Object.keys(address).length ? JSON.stringify(address) : null
  };
}

async function searchGeocodeLocation(query, regionQuery = '') {
  const term = String(query || '').trim();
  if (term.length < 3 || term.length > 200) {
    throw new Error('Escribe entre 3 y 200 caracteres para buscar una dirección.');
  }
  const response = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: { format: 'json', limit: 5, q: `${term}${regionQuery}` },
    headers: { 'User-Agent': getGeocodingUserAgent() },
    timeout: 8000
  });
  return Array.isArray(response.data) ? response.data.map((result) => ({
    displayName: result.display_name,
    latitud: Number(result.lat),
    longitud: Number(result.lon)
  })).filter((result) => Number.isFinite(result.latitud) && Number.isFinite(result.longitud)) : [];
}

function sanitizeAdmin(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    username: row.username,
    mustChangePassword: Boolean(row.must_change_password),
    isActive: Boolean(row.is_active),
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function createAuditLog(adminUserId, action, entityType, entityId, beforeState, afterState) {
  await run(
    `INSERT INTO admin_audit_log (
      admin_user_id,
      action,
      entity_type,
      entity_id,
      before_json,
      after_json,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
    [
      adminUserId || null,
      action,
      entityType,
      entityId != null ? String(entityId) : null,
      beforeState ? JSON.stringify(beforeState) : null,
      afterState ? JSON.stringify(afterState) : null
    ]
  );
}

async function getAdminById(adminId, { includePasswordHash = false } = {}) {
  const row = await get(
    `SELECT id, username, password_hash, must_change_password, is_active, last_login_at, created_at, updated_at
     FROM admin_users
     WHERE id = ?`,
    [adminId]
  );

  if (!row) {
    return null;
  }

  if (includePasswordHash) {
    return row;
  }

  return sanitizeAdmin(row);
}

async function getAdminByUsername(username, { includePasswordHash = false } = {}) {
  const row = await get(
    `SELECT id, username, password_hash, must_change_password, is_active, last_login_at, created_at, updated_at
     FROM admin_users
     WHERE lower(username) = lower(?)`,
    [username]
  );

  if (!row) {
    return null;
  }

  if (includePasswordHash) {
    return row;
  }

  return sanitizeAdmin(row);
}

async function countActiveAdmins() {
  const row = await get('SELECT COUNT(*) AS total FROM admin_users WHERE is_active = 1');
  return row ? row.total : 0;
}

async function bootstrapAdminIfNeeded(logger = console) {
  const row = await get('SELECT COUNT(*) AS total FROM admin_users WHERE is_active = 1');

  if (row && row.total > 0) {
    return { created: false };
  }

  const username = normalizeUsername(process.env.ADMIN_BOOTSTRAP_USERNAME || 'admin');
  const configuredPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!configuredPassword) {
    throw new Error('ADMIN_BOOTSTRAP_PASSWORD es obligatorio cuando no existe ningun administrador activo.');
  }
  const temporaryPassword = configuredPassword;
  validatePassword(temporaryPassword);
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  const result = await run(
    `INSERT INTO admin_users (
      username,
      password_hash,
      must_change_password,
      is_active,
      created_at,
      updated_at
    ) VALUES (?, ?, 1, 1, datetime('now', 'localtime'), datetime('now', 'localtime'))`,
    [username, passwordHash]
  );

  logger.warn('');
  logger.warn('=== Admin bootstrap ===');
  logger.warn(`Usuario admin temporal: ${username}`);
  logger.warn('Contraseña bootstrap tomada de ADMIN_BOOTSTRAP_PASSWORD; no se mostrará en logs.');
  logger.warn('Cambia esta contraseña al iniciar sesión en /admin.');
  logger.warn('=======================');
  logger.warn('');

  await createAuditLog(result.lastID, 'bootstrap_admin_created', 'admin_user', result.lastID, null, {
    username,
    mustChangePassword: true,
    isActive: true
  });

  return {
    created: true,
    username
  };
}

async function authenticateAdmin(username, password) {
  if (!username || !password) {
    return null;
  }

  const admin = await getAdminByUsername(username, { includePasswordHash: true });
  if (!admin || !admin.is_active) {
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    return null;
  }

  const isMatch = await bcrypt.compare(password, admin.password_hash);
  if (!isMatch) {
    return null;
  }

  await run(
    `UPDATE admin_users
     SET last_login_at = datetime('now', 'localtime'),
         updated_at = datetime('now', 'localtime')
     WHERE id = ?`,
    [admin.id]
  );

  return sanitizeAdmin(admin);
}

async function changeAdminPassword(adminId, nextPassword, actingAdminId = adminId) {
  validatePassword(nextPassword);

  const admin = await getAdminById(adminId, { includePasswordHash: true });
  if (!admin) {
    throw new Error('Administrador no encontrado.');
  }

  const passwordHash = await bcrypt.hash(nextPassword, 12);
  await run(
    `UPDATE admin_users
     SET password_hash = ?,
         must_change_password = 0,
         updated_at = datetime('now', 'localtime')
     WHERE id = ?`,
    [passwordHash, adminId]
  );

  await invalidateAdminSessions(adminId);

  const updated = await getAdminById(adminId);
  await createAuditLog(
    actingAdminId,
    'change_password',
    'admin_user',
    adminId,
    sanitizeAdmin(admin),
    updated
  );

  return updated;
}

async function invalidateAdminSessions(adminId) {
  const sessions = await all('SELECT sid, sess FROM admin_sessions');
  const matchingSessionIds = sessions.flatMap((sessionRow) => {
    try {
      const sessionData = JSON.parse(sessionRow.sess);
      return Number(sessionData?.adminUserId) === Number(adminId) ? [sessionRow.sid] : [];
    } catch (_error) {
      // Una sesion ilegible no debe impedir una operacion de seguridad.
      return [];
    }
  });

  for (const sid of matchingSessionIds) {
    await run('DELETE FROM admin_sessions WHERE sid = ?', [sid]);
  }

  return matchingSessionIds.length;
}

async function createAdminUser({ username, password, mustChangePassword = false, isActive = true }, actingAdminId) {
  validatePassword(password);
  const nextUsername = normalizeUsername(username);

  const existing = await getAdminByUsername(nextUsername, { includePasswordHash: true });
  if (existing) {
    throw new Error('Ya existe un administrador con ese nombre de usuario.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await run(
    `INSERT INTO admin_users (
      username,
      password_hash,
      must_change_password,
      is_active,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))`,
    [nextUsername, passwordHash, normalizeFlag(mustChangePassword), normalizeFlag(isActive)]
  );

  const created = await getAdminById(result.lastID);
  await createAuditLog(actingAdminId, 'create_admin_user', 'admin_user', result.lastID, null, created);
  return created;
}

async function updateAdminUser(adminId, updates, actingAdminId) {
  const current = await getAdminById(adminId, { includePasswordHash: true });
  if (!current) {
    throw new Error('Administrador no encontrado.');
  }

  const nextUsername = normalizeUsername(updates.username || current.username);

  const duplicate = await get(
    'SELECT id FROM admin_users WHERE lower(username) = lower(?) AND id != ?',
    [nextUsername, adminId]
  );
  if (duplicate) {
    throw new Error('Ya existe un administrador con ese nombre de usuario.');
  }

  await run(
    `UPDATE admin_users
     SET username = ?,
         updated_at = datetime('now', 'localtime')
     WHERE id = ?`,
    [nextUsername, adminId]
  );

  const updated = await getAdminById(adminId);
  await createAuditLog(
    actingAdminId,
    'update_admin_user',
    'admin_user',
    adminId,
    sanitizeAdmin(current),
    updated
  );

  return updated;
}

async function setAdminActiveState(adminId, isActive, actingAdminId) {
  const current = await getAdminById(adminId, { includePasswordHash: true });
  if (!current) {
    throw new Error('Administrador no encontrado.');
  }

  if (!isActive) {
    const activeCount = await countActiveAdmins();
    if (activeCount <= 1 && current.is_active) {
      throw new Error('No puedes desactivar el ultimo administrador activo.');
    }
    if (current.id === actingAdminId && activeCount <= 1) {
      throw new Error('No puedes desactivarte dejando el sistema sin administradores activos.');
    }
  }

  await run(
    `UPDATE admin_users
     SET is_active = ?,
         updated_at = datetime('now', 'localtime')
     WHERE id = ?`,
    [normalizeFlag(isActive), adminId]
  );

  if (!isActive) {
    await invalidateAdminSessions(adminId);
  }

  const updated = await getAdminById(adminId);
  await createAuditLog(
    actingAdminId,
    isActive ? 'activate_admin_user' : 'deactivate_admin_user',
    'admin_user',
    adminId,
    sanitizeAdmin(current),
    updated
  );

  return updated;
}

async function forcePasswordReset(adminId, actingAdminId) {
  const current = await getAdminById(adminId, { includePasswordHash: true });
  if (!current) {
    throw new Error('Administrador no encontrado.');
  }

  await run(
    `UPDATE admin_users
     SET must_change_password = 1,
         updated_at = datetime('now', 'localtime')
     WHERE id = ?`,
    [adminId]
  );

  await invalidateAdminSessions(adminId);

  const updated = await getAdminById(adminId);
  await createAuditLog(
    actingAdminId,
    'force_password_reset',
    'admin_user',
    adminId,
    sanitizeAdmin(current),
    updated
  );

  return updated;
}

async function updateIncidenciaState(incidenciaId, nextState, actingAdminId) {
  const current = await get('SELECT id, estado, tipo_id, fecha_solucion, fecha_spam FROM incidencias WHERE id = ?', [incidenciaId]);
  if (!current) {
    throw new Error('Incidencia no encontrada.');
  }

  const updates = {
    activa: `UPDATE incidencias SET estado = 'activa', fecha_solucion = NULL, fecha_spam = NULL WHERE id = ?`,
    solucionada: `UPDATE incidencias SET estado = 'solucionada', fecha_solucion = datetime('now', 'localtime') WHERE id = ?`,
    spam: `UPDATE incidencias SET estado = 'spam', fecha_spam = datetime('now', 'localtime') WHERE id = ?`
  };

  if (!updates[nextState]) {
    throw new Error('Estado de incidencia no soportado.');
  }

  await run(updates[nextState], [incidenciaId]);
  const updated = await get('SELECT id, estado, tipo_id, fecha_solucion, fecha_spam FROM incidencias WHERE id = ?', [incidenciaId]);
  await createAuditLog(actingAdminId, `set_incidencia_${nextState}`, 'incidencia', incidenciaId, current, updated);
  return updated;
}

async function changeIncidenciaTipo(incidenciaId, tipoId, actingAdminId) {
  const current = await get('SELECT id, tipo_id, estado FROM incidencias WHERE id = ?', [incidenciaId]);
  if (!current) {
    throw new Error('Incidencia no encontrada.');
  }

  const tipo = await get('SELECT id, nombre FROM tipos_incidencias WHERE id = ?', [tipoId]);
  if (!tipo) {
    throw new Error('Tipo de incidencia no encontrado.');
  }

  await run(
    `UPDATE incidencias
     SET tipo_id = ?
     WHERE id = ?`,
    [tipoId, incidenciaId]
  );

  const updated = await get('SELECT id, tipo_id, estado FROM incidencias WHERE id = ?', [incidenciaId]);
  await createAuditLog(actingAdminId, 'change_incidencia_tipo', 'incidencia', incidenciaId, current, updated);
  return { updated, tipo };
}

async function updateIncidencia(incidenciaId, updates, actingAdminId) {
  const current = await get(
    `SELECT
       id,
       tipo_id,
       descripcion,
       nombre,
       fecha,
       direccion,
       direccion_json,
       barrio,
       latitud,
       longitud,
       estado,
       fecha_solucion,
       fecha_spam
     FROM incidencias
     WHERE id = ?`,
    [incidenciaId]
  );

  if (!current) {
    throw new Error('Incidencia no encontrada.');
  }

  const nextDescripcion = String(updates.descripcion || '').trim();
  const nextNombre = String(updates.nombre || '').trim();
  const nextDireccion = String(updates.direccion || '').trim();
  const nextBarrio = String(updates.barrio || '').trim();
  const rawLatitud = String(updates.latitud || '').trim();
  const rawLongitud = String(updates.longitud || '').trim();
  const nextEstado = String(updates.estado || '').trim();
  const nextTipoId = String(updates.tipoId || '').trim();
  const nextFecha = normalizeEditableDate(updates.fecha);

  if (!nextDescripcion) {
    throw new Error('La descripcion es obligatoria.');
  }
  if (nextDescripcion.length > 500) {
    throw new Error('La descripcion no puede superar 500 caracteres.');
  }
  if (nextNombre.length > 100 || nextDireccion.length > 300 || nextBarrio.length > 120) {
    throw new Error('Uno de los campos de texto supera la longitud permitida.');
  }
  if (Boolean(rawLatitud) !== Boolean(rawLongitud)) {
    throw new Error('Indica latitud y longitud juntas.');
  }
  const nextLatitud = rawLatitud ? Number(rawLatitud) : current.latitud;
  const nextLongitud = rawLongitud ? Number(rawLongitud) : current.longitud;
  if ((rawLatitud || rawLongitud) && (!Number.isFinite(nextLatitud) || !Number.isFinite(nextLongitud) || Math.abs(nextLatitud) > 90 || Math.abs(nextLongitud) > 180)) {
    throw new Error('Las coordenadas no son válidas.');
  }

  const allowedStates = new Set(['activa', 'solucionada', 'spam']);
  if (!allowedStates.has(nextEstado)) {
    throw new Error('Estado de incidencia no soportado.');
  }

  const tipo = await get('SELECT id, nombre FROM tipos_incidencias WHERE id = ?', [nextTipoId]);
  if (!tipo) {
    throw new Error('Tipo de incidencia no encontrado.');
  }

  const fechaSolucion = nextEstado === 'solucionada'
    ? (current.estado === 'solucionada' && current.fecha_solucion
      ? current.fecha_solucion
      : new Date().toISOString().slice(0, 19).replace('T', ' '))
    : null;
  const fechaSpam = nextEstado === 'spam'
    ? (current.estado === 'spam' && current.fecha_spam
      ? current.fecha_spam
      : new Date().toISOString().slice(0, 19).replace('T', ' '))
    : null;

  const locationChanged = nextLatitud !== current.latitud || nextLongitud !== current.longitud;
  const geocoded = locationChanged ? await reverseGeocodeLocation(nextLatitud, nextLongitud) : null;
  const resolvedDireccion = geocoded?.direccion || nextDireccion || null;
  const resolvedBarrio = geocoded?.barrio || nextBarrio || null;
  const resolvedDireccionJson = geocoded?.direccion_json || current.direccion_json || null;

  await run(
    `UPDATE incidencias
     SET tipo_id = ?,
         descripcion = ?,
         nombre = ?,
         fecha = ?,
         latitud = ?,
         longitud = ?,
         direccion = ?,
         direccion_json = ?,
         barrio = ?,
         estado = ?,
         fecha_solucion = ?,
         fecha_spam = ?
     WHERE id = ?`,
    [
      nextTipoId,
      nextDescripcion,
      nextNombre || null,
      nextFecha,
      nextLatitud,
      nextLongitud,
      resolvedDireccion,
      resolvedDireccionJson,
      resolvedBarrio,
      nextEstado,
      fechaSolucion,
      fechaSpam,
      incidenciaId
    ]
  );

  const updated = await get(
    `SELECT
       id,
       tipo_id,
       descripcion,
       nombre,
       fecha,
       latitud,
       longitud,
       direccion,
       direccion_json,
       barrio,
       estado,
       fecha_solucion,
       fecha_spam
     FROM incidencias
     WHERE id = ?`,
    [incidenciaId]
  );

  await createAuditLog(actingAdminId, 'update_incidencia', 'incidencia', incidenciaId, current, updated);
  return updated;
}

async function deleteIncidenciaImage(incidenciaId, imageId, actingAdminId) {
  const incidencia = await get(
    `SELECT id, descripcion
     FROM incidencias
     WHERE id = ?`,
    [incidenciaId]
  );

  if (!incidencia) {
    throw new Error('Incidencia no encontrada.');
  }

  const image = await get(
    `SELECT id, incidencia_id, ruta_imagen, fecha_creacion
     FROM imagenes_incidencias
     WHERE id = ? AND incidencia_id = ?`,
    [imageId, incidenciaId]
  );

  if (!image) {
    throw new Error('Imagen no encontrada.');
  }

  await run('BEGIN');
  try {
    await run('DELETE FROM imagenes_incidencias WHERE id = ?', [imageId]);
    await createAuditLog(actingAdminId, 'delete_incidencia_image', 'incidencia_image', imageId, image, null);
    await run('COMMIT');
  } catch (error) {
    await run('ROLLBACK').catch(() => {});
    throw error;
  }
  await deleteImageFile(image.ruta_imagen).catch((error) => {
    console.error(`No se pudo eliminar el archivo ${path.basename(image.ruta_imagen)}:`, error.message);
  });
  return image;
}

async function addIncidenciaImage(incidenciaId, filename, actingAdminId) {
  const incidencia = await get('SELECT id FROM incidencias WHERE id = ?', [incidenciaId]);
  if (!incidencia) throw new Error('Incidencia no encontrada.');
  const result = await run('INSERT INTO imagenes_incidencias (incidencia_id, ruta_imagen) VALUES (?, ?)', [incidenciaId, filename]);
  const image = await get('SELECT id, incidencia_id, ruta_imagen, fecha_creacion FROM imagenes_incidencias WHERE id = ?', [result.lastID]);
  await createAuditLog(actingAdminId, 'add_incidencia_image', 'incidencia_image', image.id, null, image);
  return image;
}

async function replaceIncidenciaImage(incidenciaId, imageId, filename, actingAdminId) {
  const image = await get('SELECT id, incidencia_id, ruta_imagen, fecha_creacion FROM imagenes_incidencias WHERE id = ? AND incidencia_id = ?', [imageId, incidenciaId]);
  if (!image) throw new Error('Imagen no encontrada.');
  await run('UPDATE imagenes_incidencias SET ruta_imagen = ?, fecha_creacion = datetime(\'now\', \'localtime\') WHERE id = ?', [filename, imageId]);
  const updated = await get('SELECT id, incidencia_id, ruta_imagen, fecha_creacion FROM imagenes_incidencias WHERE id = ?', [imageId]);
  await createAuditLog(actingAdminId, 'replace_incidencia_image', 'incidencia_image', imageId, image, updated);
  await deleteImageFile(image.ruta_imagen).catch((error) => console.error(`No se pudo eliminar la foto reemplazada:`, error.message));
  return updated;
}

async function clearSolutionReports(incidenciaId, actingAdminId) {
  const before = await get(
    `SELECT i.id, i.estado, i.fecha_solucion,
            (SELECT COUNT(*) FROM reportes_solucion WHERE incidencia_id = i.id) AS reportes_solucion
     FROM incidencias i
     WHERE i.id = ?`,
    [incidenciaId]
  );

  if (!before) {
    throw new Error('Incidencia no encontrada.');
  }

  await run('DELETE FROM reportes_solucion WHERE incidencia_id = ?', [incidenciaId]);
  await run(
    `UPDATE incidencias
     SET estado = 'activa',
         fecha_solucion = NULL
     WHERE id = ? AND estado = 'solucionada'`,
    [incidenciaId]
  );

  const after = await get(
    `SELECT i.id, i.estado, i.fecha_solucion,
            (SELECT COUNT(*) FROM reportes_solucion WHERE incidencia_id = i.id) AS reportes_solucion
     FROM incidencias i
     WHERE i.id = ?`,
    [incidenciaId]
  );

  await createAuditLog(actingAdminId, 'clear_solution_reports', 'incidencia', incidenciaId, before, after);
  return after;
}

async function deleteSolutionReport(reportId, actingAdminId) {
  const current = await get(
    `SELECT id, incidencia_id, ip, fecha, usuario
     FROM reportes_solucion
     WHERE id = ?`,
    [reportId]
  );

  if (!current) {
    throw new Error('Reporte de solucion no encontrado.');
  }

  await run('DELETE FROM reportes_solucion WHERE id = ?', [reportId]);
  await createAuditLog(actingAdminId, 'delete_solution_report', 'solution_report', reportId, current, null);
  return current;
}

async function deleteInadequateReport(reportId, actingAdminId) {
  const current = await get(
    `SELECT id, incidencia_id, ip, fecha
     FROM reportes_inadecuado
     WHERE id = ?`,
    [reportId]
  );

  if (!current) {
    throw new Error('Reporte inadecuado no encontrado.');
  }

  await run('DELETE FROM reportes_inadecuado WHERE id = ?', [reportId]);
  await createAuditLog(actingAdminId, 'delete_inadequate_report', 'inadequate_report', reportId, current, null);
  return current;
}

async function clearInadequateReports(incidenciaId, actingAdminId) {
  const before = await get(
    `SELECT i.id, i.estado,
            (SELECT COUNT(*) FROM reportes_inadecuado WHERE incidencia_id = i.id) AS reportes_inadecuado
     FROM incidencias i
     WHERE i.id = ?`,
    [incidenciaId]
  );

  if (!before) {
    throw new Error('Incidencia no encontrada.');
  }

  await run('DELETE FROM reportes_inadecuado WHERE incidencia_id = ?', [incidenciaId]);

  const after = await get(
    `SELECT i.id, i.estado,
            (SELECT COUNT(*) FROM reportes_inadecuado WHERE incidencia_id = i.id) AS reportes_inadecuado
     FROM incidencias i
     WHERE i.id = ?`,
    [incidenciaId]
  );

  await createAuditLog(actingAdminId, 'clear_inadequate_reports', 'incidencia', incidenciaId, before, after);
  return after;
}

async function moderateInadequateIncidencias({ action, incidenciaIds }, actingAdminId) {
  const ids = [...new Set(
    (Array.isArray(incidenciaIds) ? incidenciaIds : [incidenciaIds])
      .map((id) => Number.parseInt(id, 10))
      .filter((id) => Number.isInteger(id) && id > 0)
  )];

  if (!ids.length) {
    throw new Error('Selecciona al menos una incidencia.');
  }
  if (ids.length > 100) {
    throw new Error('Puedes moderar hasta 100 incidencias a la vez.');
  }
  if (!['clear', 'delete'].includes(action)) {
    throw new Error('Selecciona una accion de moderacion valida.');
  }

  const placeholders = ids.map(() => '?').join(', ');
  const candidates = await all(
    `SELECT i.id
     FROM incidencias i
     WHERE i.id IN (${placeholders})
       AND EXISTS (
         SELECT 1 FROM reportes_inadecuado ri WHERE ri.incidencia_id = i.id
       )`,
    ids
  );
  const candidateIds = new Set(candidates.map((row) => row.id));
  if (candidateIds.size !== ids.length) {
    throw new Error('Alguna incidencia ya no tiene reportes pendientes. Actualiza la lista e intentalo de nuevo.');
  }

  for (const id of ids) {
    if (action === 'delete') {
      await deleteIncidencia(id, actingAdminId, 'ELIMINAR');
    } else {
      await clearInadequateReports(id, actingAdminId);
    }
  }

  return { action, total: ids.length };
}

async function deleteIncidencia(incidenciaId, actingAdminId, confirmationText) {
  if (String(confirmationText || '').trim() !== 'ELIMINAR') {
    throw new Error('Escribe ELIMINAR para confirmar el borrado definitivo.');
  }

  const current = await get(
    `SELECT id, tipo_id, descripcion, nombre, direccion, barrio, estado
     FROM incidencias
     WHERE id = ?`,
    [incidenciaId]
  );

  if (!current) {
    throw new Error('Incidencia no encontrada.');
  }

  const [solutionReports, inadequateReports, externalReports, images] = await Promise.all([
    all('SELECT id FROM reportes_solucion WHERE incidencia_id = ?', [incidenciaId]),
    all('SELECT id FROM reportes_inadecuado WHERE incidencia_id = ?', [incidenciaId]),
    all('SELECT id FROM external_report_events WHERE incidencia_id = ?', [incidenciaId]),
    all('SELECT id, ruta_imagen FROM imagenes_incidencias WHERE incidencia_id = ?', [incidenciaId])
  ]);

  await run('BEGIN');
  try {
    await run('DELETE FROM reportes_solucion WHERE incidencia_id = ?', [incidenciaId]);
    await run('DELETE FROM reportes_inadecuado WHERE incidencia_id = ?', [incidenciaId]);
    await run('DELETE FROM external_report_events WHERE incidencia_id = ?', [incidenciaId]);
    await run('DELETE FROM imagenes_incidencias WHERE incidencia_id = ?', [incidenciaId]);
    await run('DELETE FROM incidencias WHERE id = ?', [incidenciaId]);

    await createAuditLog(actingAdminId, 'delete_incidencia', 'incidencia', incidenciaId, {
      ...current,
      solutionReports: solutionReports.length,
      inadequateReports: inadequateReports.length,
      externalReports: externalReports.length,
      images: images.map((image) => image.ruta_imagen)
    }, null);
    await run('COMMIT');
  } catch (error) {
    await run('ROLLBACK').catch(() => {});
    throw error;
  }

  await Promise.all(images.map((image) => deleteImageFile(image.ruta_imagen).catch((error) => {
    console.error(`No se pudo eliminar el archivo ${path.basename(image.ruta_imagen)}:`, error.message);
  })));

  return current;
}

async function mergeTipos(sourceTipoId, targetTipoId, actingAdminId) {
  if (String(sourceTipoId) === String(targetTipoId)) {
    throw new Error('El tipo de origen y destino no pueden ser el mismo.');
  }

  const source = await get('SELECT id, nombre FROM tipos_incidencias WHERE id = ?', [sourceTipoId]);
  const target = await get('SELECT id, nombre FROM tipos_incidencias WHERE id = ?', [targetTipoId]);

  if (!source || !target) {
    throw new Error('No se encontro alguno de los tipos seleccionados.');
  }

  const beforeCount = await get('SELECT COUNT(*) AS total FROM incidencias WHERE tipo_id = ?', [sourceTipoId]);
  await run('UPDATE incidencias SET tipo_id = ? WHERE tipo_id = ?', [targetTipoId, sourceTipoId]);
  await createAuditLog(
    actingAdminId,
    'merge_tipos',
    'tipo',
    sourceTipoId,
    { source, affectedIncidencias: beforeCount.total },
    { target }
  );

  return {
    affectedIncidencias: beforeCount.total,
    source,
    target
  };
}

async function deleteTipoIfUnused(tipoId, actingAdminId) {
  const tipo = await get('SELECT id, nombre FROM tipos_incidencias WHERE id = ?', [tipoId]);
  if (!tipo) {
    throw new Error('Tipo no encontrado.');
  }

  const inUse = await get('SELECT COUNT(*) AS total FROM incidencias WHERE tipo_id = ?', [tipoId]);
  if (inUse.total > 0) {
    throw new Error('No se puede borrar un tipo que tiene incidencias asociadas.');
  }

  await run('DELETE FROM tipos_incidencias WHERE id = ?', [tipoId]);
  await createAuditLog(actingAdminId, 'delete_tipo', 'tipo', tipoId, tipo, null);
}

async function previewOldSolvable({ days, votes }) {
  const safeDays = Number.parseInt(days, 10);
  const safeVotes = Number.parseInt(votes, 10);
  if (!Number.isInteger(safeDays) || safeDays < 1 || safeDays > 3650 ||
      !Number.isInteger(safeVotes) || safeVotes < 1 || safeVotes > 1000) {
    throw new Error('Los criterios de antiguedad o votos no son validos.');
  }
  return all(
    `SELECT
       i.id,
       i.descripcion,
       i.fecha,
       i.estado,
       t.nombre AS tipo,
       CAST(julianday('now', 'localtime') - julianday(i.fecha) AS INTEGER) AS antiguedad_dias,
       COUNT(rs.id) AS votos_solucion
     FROM incidencias i
     LEFT JOIN tipos_incidencias t ON t.id = i.tipo_id
     LEFT JOIN reportes_solucion rs ON rs.incidencia_id = i.id
     WHERE i.estado = 'activa'
       AND datetime(i.fecha) <= datetime('now', 'localtime', ?)
     GROUP BY i.id, i.descripcion, i.fecha, i.estado, t.nombre
     HAVING COUNT(rs.id) >= ?
     ORDER BY datetime(i.fecha) ASC`,
    [`-${safeDays} days`, safeVotes]
  );
}

async function executeOldSolvable({ days, votes, incidenciaIds }, actingAdminId) {
  const candidates = await previewOldSolvable({ days, votes });
  let selectedCandidates = candidates;

  if (incidenciaIds !== undefined) {
    const safeIds = new Set(
      (Array.isArray(incidenciaIds) ? incidenciaIds : [incidenciaIds])
        .map((id) => Number.parseInt(id, 10))
        .filter((id) => Number.isInteger(id) && id > 0)
    );
    selectedCandidates = candidates.filter((candidate) => safeIds.has(candidate.id));
    if (!selectedCandidates.length) {
      throw new Error('Selecciona al menos una incidencia que siga cumpliendo los criterios.');
    }
  }

  for (const candidate of selectedCandidates) {
    await run(
      `UPDATE incidencias
       SET estado = 'solucionada',
           fecha_solucion = datetime('now', 'localtime')
       WHERE id = ?`,
      [candidate.id]
    );
    await createAuditLog(actingAdminId, 'auto_solve_old_incidencia', 'incidencia', candidate.id, candidate, {
      ...candidate,
      estado: 'solucionada'
    });
  }

  return selectedCandidates;
}

async function getPendingSolutionIncidencias() {
  return all(
    `SELECT
       i.id,
       i.descripcion,
       i.estado,
       i.fecha,
       t.nombre AS tipo,
       COUNT(rs.id) AS reportes_solucion
     FROM incidencias i
     JOIN tipos_incidencias t ON t.id = i.tipo_id
     JOIN reportes_solucion rs ON rs.incidencia_id = i.id
     WHERE i.estado = 'activa'
     GROUP BY i.id, i.descripcion, i.estado, i.fecha, t.nombre
     ORDER BY reportes_solucion DESC, datetime(i.fecha) ASC`
  );
}

async function getInadequateReportedIncidencias() {
  return all(
    `SELECT
       i.id,
       i.descripcion,
       i.estado,
       i.fecha,
       i.barrio,
       t.nombre AS tipo,
       COUNT(ri.id) AS reportes_inadecuado
     FROM incidencias i
     JOIN tipos_incidencias t ON t.id = i.tipo_id
     JOIN reportes_inadecuado ri ON ri.incidencia_id = i.id
     GROUP BY i.id, i.descripcion, i.estado, i.fecha, i.barrio, t.nombre
     ORDER BY reportes_inadecuado DESC, datetime(i.fecha) DESC`
  );
}

function summarizeAuditAction(action) {
  const labels = {
    update_incidencia: 'Editó los datos de la incidencia',
    set_incidencia_activa: 'Marcó la incidencia como activa',
    set_incidencia_solucionada: 'Marcó la incidencia como solucionada',
    set_incidencia_spam: 'Marcó la incidencia como spam',
    change_incidencia_tipo: 'Cambió la categoría',
    clear_solution_reports: 'Limpió los reportes de solución',
    clear_inadequate_reports: 'Limpió los reportes inadecuados',
    delete_solution_report: 'Eliminó un reporte de solución',
    delete_inadequate_report: 'Eliminó un reporte inadecuado',
    delete_incidencia_image: 'Eliminó una foto',
    delete_external_report_event: 'Eliminó un aviso al ayuntamiento',
    auto_solve_old_incidencia: 'Marcó como solucionada automáticamente',
    hydrate_location_data: 'Actualizó la ubicación'
  };
  return labels[action] || action.replaceAll('_', ' ');
}

async function getIncidenciaTimeline(incidenciaId) {
  const [solutionReports, inadequateReports, externalReports, imports, auditEntries, incidencia] = await Promise.all([
    all('SELECT id, fecha, usuario FROM reportes_solucion WHERE incidencia_id = ?', [incidenciaId]),
    all('SELECT id, fecha FROM reportes_inadecuado WHERE incidencia_id = ?', [incidenciaId]),
    all(`SELECT id, channel, event_type, created_at FROM external_report_events WHERE incidencia_id = ?`, [incidenciaId]),
    all(`SELECT id, channel, total, source, first_reported_at, imported_at FROM external_report_imports WHERE incidencia_id = ?`, [incidenciaId]),
    all(
      `SELECT l.action, l.entity_type, l.entity_id, l.before_json, l.after_json, l.created_at, u.username
       FROM admin_audit_log l
       LEFT JOIN admin_users u ON u.id = l.admin_user_id
       WHERE (l.entity_type = 'incidencia' AND l.entity_id = ?)
          OR l.before_json LIKE ? OR l.after_json LIKE ?
       ORDER BY datetime(l.created_at) ASC, l.id ASC`,
      [String(incidenciaId), `%"incidencia_id":${incidenciaId}%`, `%"incidencia_id":${incidenciaId}%`]
    ),
    get('SELECT fecha, nombre FROM incidencias WHERE id = ?', [incidenciaId])
  ]);

  const entries = [];
  if (incidencia) {
    entries.push({ type: 'usuario', action: 'incidencia_creada', label: 'Envió la incidencia', detail: incidencia.nombre || null, date: incidencia.fecha });
  }
  solutionReports.forEach((report) => entries.push({ type: 'usuario', action: 'reporte_solucion', label: 'Indicó que estaba solucionada', detail: report.usuario || null, date: report.fecha }));
  inadequateReports.forEach((report) => entries.push({ type: 'usuario', action: 'reporte_inadecuado', label: 'Reportó contenido inadecuado', date: report.fecha }));
  externalReports.forEach((report) => entries.push({ type: 'usuario', action: 'aviso_ayuntamiento', label: `Abrió el aviso por ${report.channel === 'whatsapp' ? 'WhatsApp' : report.channel}`, date: report.created_at }));
  imports.forEach((report) => entries.push({
    type: 'sistema',
    action: 'aviso_importado',
    label: 'Importación de avisos',
    detail: `${report.total} aviso${report.total === 1 ? '' : 's'}${report.source ? ` · ${report.source}` : ''}`,
    date: report.imported_at || report.first_reported_at
  }));
  auditEntries.forEach((entry) => entries.push({ type: 'admin', action: entry.action, label: summarizeAuditAction(entry.action), detail: entry.username || 'Administrador eliminado', date: entry.created_at }));

  return entries.sort((left, right) => new Date(right.date || 0) - new Date(left.date || 0));
}

async function deleteExternalReportEvent(incidenciaId, eventId, actingAdminId) {
  const event = await get(
    `SELECT id, incidencia_id, channel, event_type, reporter_fingerprint, created_at
     FROM external_report_events WHERE id = ? AND incidencia_id = ?`,
    [eventId, incidenciaId]
  );
  if (!event) throw new Error('Aviso al ayuntamiento no encontrado.');

  await run('BEGIN');
  try {
    await run('DELETE FROM external_report_events WHERE id = ?', [event.id]);
    await createAuditLog(actingAdminId, 'delete_external_report_event', 'external_report_event', event.id, event, null);
    await run('COMMIT');
  } catch (error) {
    await run('ROLLBACK').catch(() => {});
    throw error;
  }
  return event;
}

async function getIncidenciaDetail(incidenciaId) {
  const incidencia = await get(
    `SELECT
       i.id,
       i.tipo_id,
       i.descripcion,
       i.latitud,
       i.longitud,
       i.nombre,
       i.fecha,
       i.direccion,
       i.barrio,
       i.estado,
       i.fecha_solucion,
       i.fecha_spam,
       i.ip,
       i.codigo_unico,
       t.nombre AS tipo,
       t.icono AS tipo_icono,
       (SELECT COUNT(*) FROM reportes_solucion WHERE incidencia_id = i.id) AS reportes_solucion,
       (SELECT COUNT(*) FROM reportes_inadecuado WHERE incidencia_id = i.id) AS reportes_inadecuado,
       ${WHATSAPP_REPORT_TOTAL_SQL} AS avisos_ayuntamiento
     FROM incidencias i
     JOIN tipos_incidencias t ON t.id = i.tipo_id
     WHERE i.id = ?`,
    [incidenciaId]
  );

  if (!incidencia) {
    return null;
  }

  const imagenes = await all(
    `SELECT id, ruta_imagen
     FROM imagenes_incidencias
     WHERE incidencia_id = ?
     ORDER BY id ASC`,
    [incidenciaId]
  );

  const [solutionReports, inadequateReports, externalReports, timeline] = await Promise.all([
    all(
      `SELECT id, ip, fecha, usuario
       FROM reportes_solucion
       WHERE incidencia_id = ?
       ORDER BY datetime(fecha) DESC, id DESC`,
      [incidenciaId]
    ),
    all(
      `SELECT id, ip, fecha
       FROM reportes_inadecuado
       WHERE incidencia_id = ?
       ORDER BY datetime(fecha) DESC, id DESC`,
      [incidenciaId]
    ),
    all(
      `SELECT id, channel, event_type, reporter_fingerprint, created_at
       FROM external_report_events
       WHERE incidencia_id = ?
       ORDER BY datetime(created_at) DESC, id DESC`,
      [incidenciaId]
    ),
    getIncidenciaTimeline(incidenciaId)
  ]);

  return {
    ...incidencia,
    images: imagenes.map((image) => ({
      id: image.id,
      url: `/uploads/${image.ruta_imagen}`,
      filename: image.ruta_imagen
    })),
    imageUrls: imagenes.map((image) => `/uploads/${image.ruta_imagen}`),
    solutionReports,
    inadequateReports,
    externalReports: externalReports.map((report) => ({
      ...report,
      fingerprintShort: `${String(report.reporter_fingerprint || '').slice(0, 10)}…`
    })),
    timeline
  };
}

async function getAdminIncidenciasList({ search = '', estado = '', tipoId = '', sortBy = 'fecha', sortDir = 'desc' } = {}) {
  const clauses = [];
  const params = [];

  if (search) {
    clauses.push('(lower(i.descripcion) LIKE lower(?) OR lower(ifnull(i.direccion, \'\')) LIKE lower(?) OR lower(ifnull(i.barrio, \'\')) LIKE lower(?))');
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  if (estado) {
    clauses.push('i.estado = ?');
    params.push(estado);
  }

  if (tipoId) {
    clauses.push('i.tipo_id = ?');
    params.push(tipoId);
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const allowedSorts = {
    id: 'i.id',
    fecha: 'datetime(i.fecha)',
    tipo: 'lower(t.nombre)',
    estado: 'lower(i.estado)',
    barrio: 'lower(ifnull(i.barrio, \'\'))',
    avisos: WHATSAPP_REPORT_TOTAL_SQL
  };
  const sortColumn = allowedSorts[sortBy] || allowedSorts.fecha;
  const direction = String(sortDir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  return all(
    `SELECT
       i.id,
       i.descripcion,
       i.fecha,
       i.direccion,
       i.barrio,
       i.estado,
       i.tipo_id,
       t.nombre AS tipo,
       t.icono AS tipo_icono,
       ${WHATSAPP_REPORT_TOTAL_SQL} AS avisos_ayuntamiento,
       img.ruta_imagen
     FROM incidencias i
     JOIN tipos_incidencias t ON t.id = i.tipo_id
     LEFT JOIN imagenes_incidencias img
       ON img.id = (
         SELECT id
         FROM imagenes_incidencias
         WHERE incidencia_id = i.id
         ORDER BY id ASC
         LIMIT 1
       )
     ${whereSql}
     ORDER BY ${sortColumn} ${direction}, i.id DESC
     LIMIT 100`,
    params
  ).then((rows) => rows.map((row) => ({
    ...row,
    imageUrl: row.ruta_imagen ? `/uploads/${row.ruta_imagen}` : null
  })));
}

async function getAdminExternalReportsList({ search = '', estado = '', tipoId = '', sortBy = 'avisos', sortDir = 'desc' } = {}) {
  const clauses = ['COALESCE(r.total, 0) > 0'];
  const params = [];

  if (search) {
    clauses.push('(lower(i.descripcion) LIKE lower(?) OR lower(ifnull(i.direccion, \'\')) LIKE lower(?) OR lower(ifnull(i.barrio, \'\')) LIKE lower(?))');
    const term = `%${search}%`;
    params.push(term, term, term);
  }
  if (estado) {
    clauses.push('i.estado = ?');
    params.push(estado);
  }
  if (tipoId) {
    clauses.push('i.tipo_id = ?');
    params.push(tipoId);
  }

  const allowedSorts = {
    avisos: 'COALESCE(r.total, 0)',
    fecha: 'datetime(i.fecha)',
    tipo: 'lower(t.nombre)',
    estado: 'lower(i.estado)',
    barrio: 'lower(ifnull(i.barrio, \'\'))'
  };
  const sortColumn = allowedSorts[sortBy] || allowedSorts.avisos;
  const direction = String(sortDir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  return all(
    `WITH report_totals AS (
       SELECT incidencia_id, COUNT(*) AS total
       FROM external_report_events
       WHERE channel = 'whatsapp'
       GROUP BY incidencia_id
       UNION ALL
       SELECT incidencia_id, SUM(total) AS total
       FROM external_report_imports
       WHERE channel = 'whatsapp'
       GROUP BY incidencia_id
     ), aggregated_reports AS (
       SELECT incidencia_id, SUM(total) AS total
       FROM report_totals
       GROUP BY incidencia_id
     )
     SELECT i.id, i.descripcion, i.fecha, i.direccion, i.barrio, i.estado,
            t.nombre AS tipo, t.icono AS tipo_icono, COALESCE(r.total, 0) AS avisos_ayuntamiento
     FROM incidencias i
     JOIN tipos_incidencias t ON t.id = i.tipo_id
     LEFT JOIN aggregated_reports r ON r.incidencia_id = i.id
     WHERE ${clauses.join(' AND ')}
     ORDER BY ${sortColumn} ${direction}, i.id DESC
     LIMIT 100`,
    params
  ).then((rows) => rows.map((row) => ({ ...row, avisos_ayuntamiento: Number(row.avisos_ayuntamiento) })));
}

async function getAdminDashboardData() {
  const [statsRow, pendingReview, recentWithPhoto, recentWithoutPhoto, byTipo, externalReports] = await Promise.all([
    get(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN estado = 'activa' THEN 1 ELSE 0 END) AS activas,
         SUM(CASE WHEN estado = 'solucionada' THEN 1 ELSE 0 END) AS solucionadas,
         SUM(CASE WHEN estado = 'spam' THEN 1 ELSE 0 END) AS spam
       FROM incidencias`
    ),
    get(
      `SELECT COUNT(DISTINCT i.id) AS total
       FROM incidencias i
       JOIN reportes_solucion rs ON rs.incidencia_id = i.id
       WHERE i.estado = 'activa'`
    ),
    all(
      `SELECT
         i.id,
         i.descripcion,
         i.estado,
        i.fecha,
         i.barrio,
         i.direccion,
        t.nombre AS tipo,
        t.icono AS tipo_icono,
        ${WHATSAPP_REPORT_TOTAL_SQL} AS avisos_ayuntamiento,
        img.ruta_imagen
      FROM incidencias i
       JOIN tipos_incidencias t ON t.id = i.tipo_id
       JOIN imagenes_incidencias img
         ON img.id = (
           SELECT id
           FROM imagenes_incidencias
           WHERE incidencia_id = i.id
           ORDER BY id ASC
           LIMIT 1
         )
       ORDER BY datetime(i.fecha) DESC
       LIMIT 6`
    ),
    all(
      `SELECT
         i.id,
         i.descripcion,
         i.estado,
         i.fecha,
         i.barrio,
         i.direccion,
         t.nombre AS tipo
       FROM incidencias i
       JOIN tipos_incidencias t ON t.id = i.tipo_id
       WHERE NOT EXISTS (
         SELECT 1
         FROM imagenes_incidencias img
         WHERE img.incidencia_id = i.id
       )
       ORDER BY datetime(i.fecha) DESC
       LIMIT 6`
    ),
    all(
      `SELECT
        t.id,
        t.nombre,
        t.icono,
        COUNT(i.id) AS total,
        SUM(CASE WHEN i.estado = 'activa' THEN 1 ELSE 0 END) AS activas,
        SUM(CASE WHEN i.estado = 'solucionada' THEN 1 ELSE 0 END) AS solucionadas
      FROM tipos_incidencias t
      LEFT JOIN incidencias i ON i.tipo_id = t.id
      GROUP BY t.id, t.nombre, t.icono
      HAVING COUNT(i.id) > 0
       ORDER BY COUNT(i.id) DESC, t.nombre COLLATE NOCASE ASC
       LIMIT 8`
    ),
    all(
      `WITH report_totals AS (
         SELECT incidencia_id, channel, COUNT(*) AS total
         FROM external_report_events
         GROUP BY incidencia_id, channel
         UNION ALL
         SELECT incidencia_id, channel, SUM(total) AS total
         FROM external_report_imports
         GROUP BY incidencia_id, channel
       )
       SELECT
         r.incidencia_id AS incidenciaId,
         r.channel,
         SUM(r.total) AS total,
         i.estado,
         i.descripcion
       FROM report_totals r
       JOIN incidencias i ON i.id = r.incidencia_id
       WHERE r.channel = 'whatsapp'
       GROUP BY r.incidencia_id, r.channel, i.estado, i.descripcion
       ORDER BY total DESC, r.incidencia_id DESC
       LIMIT 5`
    )
  ]);

  return {
    stats: {
      total: Number(statsRow?.total || 0),
      activas: Number(statsRow?.activas || 0),
      solucionadas: Number(statsRow?.solucionadas || 0),
      spam: Number(statsRow?.spam || 0),
      pendientesRevision: Number(pendingReview?.total || 0)
    },
    recentWithPhoto: recentWithPhoto.map((item) => ({
      ...item,
      imageUrl: item.ruta_imagen ? `/uploads/${item.ruta_imagen}` : null
    })),
    recentWithoutPhoto,
    byTipo,
    externalReports: externalReports.map((item) => ({
      ...item,
      total: Number(item.total)
    }))
  };
}

async function getMissingLocationIncidencias(limit = 100) {
  return all(
    `SELECT
       i.id,
       i.descripcion,
       i.direccion,
       i.barrio,
       i.direccion_json,
       i.latitud,
       i.longitud,
       i.estado,
       t.nombre AS tipo
     FROM incidencias i
     JOIN tipos_incidencias t ON t.id = i.tipo_id
     WHERE (i.barrio IS NULL OR i.barrio = '' OR i.direccion IS NULL OR i.direccion = '' OR i.direccion_json IS NULL OR i.direccion_json = '')
       AND i.latitud IS NOT NULL
       AND i.longitud IS NOT NULL
     ORDER BY datetime(i.fecha) DESC, i.id DESC
     LIMIT ?`,
    [limit]
  );
}

async function processMissingLocationIncidencias(limit = 100, actingAdminId, geocodeFn = reverseGeocodeLocation) {
  const candidates = await getMissingLocationIncidencias(limit);
  const results = [];

  for (const candidate of candidates) {
    const before = {
      id: candidate.id,
      direccion: candidate.direccion,
      barrio: candidate.barrio,
      direccion_json: candidate.direccion_json
    };
    const geocoded = await geocodeFn(candidate.latitud, candidate.longitud);
    const nextDireccion = candidate.direccion || geocoded.direccion || null;
    const nextBarrio = candidate.barrio || geocoded.barrio || null;
    const nextDireccionJson = candidate.direccion_json || geocoded.direccion_json || null;

    await run(
      `UPDATE incidencias
       SET direccion = ?,
           barrio = ?,
           direccion_json = ?
       WHERE id = ?`,
      [nextDireccion, nextBarrio, nextDireccionJson, candidate.id]
    );

    const after = {
      id: candidate.id,
      direccion: nextDireccion,
      barrio: nextBarrio,
      direccion_json: nextDireccionJson
    };
    await createAuditLog(actingAdminId, 'hydrate_location_data', 'incidencia', candidate.id, before, after);
    results.push(after);
  }

  return results;
}

async function getAdminUsersList() {
  return all(
    `SELECT
       id,
       username,
       is_active,
       must_change_password,
       last_login_at,
       created_at
     FROM admin_users
     ORDER BY lower(username) ASC`
  );
}

async function getAdminAuditEntries(limit = 50) {
  return all(
    `SELECT
       l.id,
       l.action,
       l.entity_type,
       l.entity_id,
       l.created_at,
       u.username AS admin_username
     FROM admin_audit_log l
     LEFT JOIN admin_users u ON u.id = l.admin_user_id
     ORDER BY datetime(l.created_at) DESC, l.id DESC
     LIMIT ?`,
    [limit]
  );
}

async function getTipoSummary() {
  return all(
    `SELECT
       t.id,
       t.nombre,
       t.icono,
       COUNT(i.id) AS total,
       SUM(CASE WHEN i.estado = 'activa' THEN 1 ELSE 0 END) AS activas,
       SUM(CASE WHEN i.estado = 'solucionada' THEN 1 ELSE 0 END) AS solucionadas
     FROM tipos_incidencias t
     LEFT JOIN incidencias i ON i.tipo_id = t.id
     GROUP BY t.id, t.nombre, t.icono
     ORDER BY lower(t.nombre) ASC`
  );
}

async function createTipo(nombre, icono, actingAdminId) {
  const nextNombre = String(nombre || '').trim();
  if (!nextNombre) {
    throw new Error('El nombre de la categoria es obligatorio.');
  }
  if (nextNombre.length > 100) {
    throw new Error('El nombre de la categoria no puede superar 100 caracteres.');
  }
  const nextIcon = normalizeTipoIcon(icono || DEFAULT_TIPO_ICON);

  const existing = await get(
    'SELECT id, nombre, icono FROM tipos_incidencias WHERE lower(nombre) = lower(?)',
    [nextNombre]
  );
  if (existing) {
    throw new Error('Ya existe una categoria con ese nombre.');
  }

  const result = await run(
    'INSERT INTO tipos_incidencias (nombre, icono) VALUES (?, ?)',
    [nextNombre, nextIcon]
  );

  const created = await get(
    'SELECT id, nombre, icono FROM tipos_incidencias WHERE id = ?',
    [result.lastID]
  );
  await createAuditLog(actingAdminId, 'create_tipo', 'tipo', result.lastID, null, created);
  return created;
}

async function renameTipo(tipoId, nombre, icono, actingAdminId) {
  const current = await get(
    'SELECT id, nombre, icono FROM tipos_incidencias WHERE id = ?',
    [tipoId]
  );
  if (!current) {
    throw new Error('Categoria no encontrada.');
  }

  const nextNombre = String(nombre || '').trim();
  if (!nextNombre) {
    throw new Error('El nombre de la categoria es obligatorio.');
  }
  if (nextNombre.length > 100) {
    throw new Error('El nombre de la categoria no puede superar 100 caracteres.');
  }
  const nextIcon = normalizeTipoIcon(icono || current.icono || DEFAULT_TIPO_ICON);

  const duplicate = await get(
    'SELECT id FROM tipos_incidencias WHERE lower(nombre) = lower(?) AND id != ?',
    [nextNombre, tipoId]
  );
  if (duplicate) {
    throw new Error('Ya existe una categoria con ese nombre.');
  }

  await run(
    'UPDATE tipos_incidencias SET nombre = ?, icono = ? WHERE id = ?',
    [nextNombre, nextIcon, tipoId]
  );

  const updated = await get(
    'SELECT id, nombre, icono FROM tipos_incidencias WHERE id = ?',
    [tipoId]
  );
  await createAuditLog(actingAdminId, 'rename_tipo', 'tipo', tipoId, current, updated);
  return updated;
}

module.exports = {
  PASSWORD_MIN_LENGTH,
  authenticateAdmin,
  bootstrapAdminIfNeeded,
  changeAdminPassword,
  changeIncidenciaTipo,
  clearInadequateReports,
  clearSolutionReports,
  countActiveAdmins,
  createTipo,
  addIncidenciaImage,
  createAdminUser,
  createAuditLog,
  deleteIncidencia,
  deleteIncidenciaImage,
  deleteInadequateReport,
  deleteExternalReportEvent,
  deleteSolutionReport,
  deleteTipoIfUnused,
  executeOldSolvable,
  forcePasswordReset,
  getAdminAuditEntries,
  getAdminDashboardData,
  getAdminById,
  getAdminIncidenciasList,
  getAdminExternalReportsList,
  getAdminUsersList,
  getIncidenciaDetail,
  getInadequateReportedIncidencias,
  invalidateAdminSessions,
  getMissingLocationIncidencias,
  getAdminByUsername,
  getPendingSolutionIncidencias,
  getTipoSummary,
  mergeTipos,
  moderateInadequateIncidencias,
  previewOldSolvable,
  processMissingLocationIncidencias,
  renameTipo,
  replaceIncidenciaImage,
  reverseGeocodeLocation,
  searchGeocodeLocation,
  sanitizeAdmin,
  setAdminActiveState,
  updateAdminPassword: changeAdminPassword,
  updateAdminUser,
  updateIncidencia,
  updateIncidenciaState,
  validatePassword
};
