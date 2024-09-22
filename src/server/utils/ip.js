function obtenerIP(req) {
  return req.headers['x-real-ip'] || 
         req.headers['x-forwarded-for']?.split(',')[0] || 
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         req.connection.socket?.remoteAddress ||
         'Desconocida';
}

module.exports = { obtenerIP };