const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('../config/database');

const SECRET_FILENAME = '.external-report-fingerprint-secret';
let cachedSecret;

function isValidSecret(secret) {
  return typeof secret === 'string' && Buffer.byteLength(secret, 'utf8') >= 32;
}

function getSecretPath() {
  return path.join(path.dirname(db.dbPath), SECRET_FILENAME);
}

function readStoredSecret(secretPath) {
  try {
    const secret = fs.readFileSync(secretPath, 'utf8').trim();
    return isValidSecret(secret) ? secret : null;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function ensureExternalReportFingerprintSecret() {
  if (cachedSecret) return cachedSecret;

  const environmentSecret = String(process.env.EXTERNAL_REPORT_FINGERPRINT_SECRET || '').trim();
  if (environmentSecret) {
    if (!isValidSecret(environmentSecret)) {
      throw new Error('EXTERNAL_REPORT_FINGERPRINT_SECRET debe tener al menos 32 caracteres.');
    }
    cachedSecret = environmentSecret;
    return cachedSecret;
  }

  const secretPath = getSecretPath();
  const storedSecret = readStoredSecret(secretPath);
  if (storedSecret) {
    cachedSecret = storedSecret;
    return cachedSecret;
  }

  fs.mkdirSync(path.dirname(secretPath), { recursive: true, mode: 0o700 });
  const generatedSecret = crypto.randomBytes(32).toString('hex');
  const temporaryPath = `${secretPath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, `${generatedSecret}\n`, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(temporaryPath, secretPath);
  cachedSecret = generatedSecret;
  console.log('Se ha generado el secreto local para deduplicar avisos externos.');
  return cachedSecret;
}

module.exports = { ensureExternalReportFingerprintSecret };
