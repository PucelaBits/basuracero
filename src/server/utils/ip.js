const crypto = require('crypto');

function obtenerIP(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || 
             req.headers['x-real-ip'] || 
             req.connection.remoteAddress ||
             req.socket.remoteAddress ||
             req.connection.socket?.remoteAddress ||
             'Desconocida';
  return ip === '::1' || ip === '127.0.0.1' ? 'Desconocida' : hashearIP(ip);
}

function hashearIP(ip) {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

module.exports = { obtenerIP };