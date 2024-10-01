const crypto = require('crypto');

function obtenerIP(req) {
  console.log('Headers:', req.headers);
  console.log('Connection remote address:', req.connection.remoteAddress);
  const ip = req.headers['x-real-ip'] || 
             req.headers['x-forwarded-for']?.split(',')[0] || 
             req.connection.remoteAddress ||
             req.socket.remoteAddress ||
             req.connection.socket?.remoteAddress ||
             'Desconocida';
  
  return hashearIP(ip);
}

function hashearIP(ip) {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

module.exports = { obtenerIP };