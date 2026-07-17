const crypto = require('crypto');
const { ensureExternalReportFingerprintSecret } = require('./externalReportFingerprintSecret');

function obtenerIP(req) {
  // Express solo usa X-Forwarded-For cuando TRUST_PROXY está configurado.
  const ip = req.ip || req.socket?.remoteAddress || 'Desconocida';
  return ip === '::1' || ip === '127.0.0.1' ? 'Desconocida' : hashearIP(ip);
}

function hashearIP(ip) {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

function obtenerHuellaReportante(req) {
  const secret = ensureExternalReportFingerprintSecret();

  const userAgent = String(req.get?.('user-agent') || '').trim().toLowerCase().slice(0, 512);
  return crypto
    .createHmac('sha256', secret)
    .update(`${obtenerIP(req)}\u0000${userAgent}`)
    .digest('hex');
}

module.exports = { obtenerHuellaReportante, obtenerIP };
