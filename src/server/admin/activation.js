const fs = require('fs');
const path = require('path');

const ADMIN_MARKER_FILENAME = '.admin-enabled';

function parseExplicitBoolean(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function getDatabasePath(env = process.env) {
  return env.SQLITE_DB_PATH
    ? path.resolve(env.SQLITE_DB_PATH)
    : path.join(__dirname, '..', '..', '..', 'data', 'incidencias.sqlite');
}

function getAdminMarkerPath(env = process.env) {
  return path.join(path.dirname(getDatabasePath(env)), ADMIN_MARKER_FILENAME);
}

function isAdminEnabled(env = process.env) {
  const explicitValue = parseExplicitBoolean(env.ADMIN_ENABLED);
  if (explicitValue !== null) {
    return explicitValue;
  }
  return fs.existsSync(getAdminMarkerPath(env));
}

function enableAdmin(env = process.env) {
  const markerPath = getAdminMarkerPath(env);
  fs.mkdirSync(path.dirname(markerPath), { recursive: true });
  fs.writeFileSync(markerPath, 'enabled\n', { encoding: 'utf8', mode: 0o600 });
  return markerPath;
}

function prepareAdminActivation(env = process.env) {
  const explicitValue = parseExplicitBoolean(env.ADMIN_ENABLED);
  const databasePath = getDatabasePath(env);
  const markerPath = getAdminMarkerPath(env);
  const databaseAlreadyExists = fs.existsSync(databasePath);

  if (explicitValue === true) {
    enableAdmin(env);
  } else if (explicitValue === null && !databaseAlreadyExists && !fs.existsSync(markerPath)) {
    enableAdmin(env);
  }

  return {
    adminEnabled: isAdminEnabled(env),
    databaseAlreadyExists,
    markerPath
  };
}

module.exports = {
  ADMIN_MARKER_FILENAME,
  enableAdmin,
  getAdminMarkerPath,
  getDatabasePath,
  isAdminEnabled,
  parseExplicitBoolean,
  prepareAdminActivation
};
