const db = require('../config/database');

function eliminarIncidencia(id) {
  return new Promise((resolve, reject) => {
    const sql = `DELETE FROM incidencias WHERE id = ?`;
    
    db.run(sql, id, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(`Incidencia con id ${id} eliminada`);
      }
    });
  });
}

module.exports = { eliminarIncidencia };