const db = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

function eliminarIncidencia(id, borrarImagenes) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      if (borrarImagenes) {
        db.all('SELECT ruta_imagen FROM imagenes_incidencias WHERE incidencia_id = ?', [id], async (err, rows) => {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
            return;
          }

          for (const row of rows) {
            const rutaCompleta = path.join(__dirname, '..', '..', '..', 'uploads', row.ruta_imagen);
            try {
              await fs.unlink(rutaCompleta);
            } catch (error) {
              console.error(`Error al eliminar la imagen ${rutaCompleta}:`, error);
            }
          }

          db.run('DELETE FROM imagenes_incidencias WHERE incidencia_id = ?', [id], (err) => {
            if (err) {
              db.run('ROLLBACK');
              reject(err);
              return;
            }

            eliminarIncidenciaFinal(id, db, resolve, reject);
          });
        });
      } else {
        eliminarIncidenciaFinal(id, db, resolve, reject);
      }
    });
  });
}

function eliminarIncidenciaFinal(id, db, resolve, reject) {
  db.run('DELETE FROM incidencias WHERE id = ?', [id], function(err) {
    if (err) {
      db.run('ROLLBACK');
      reject(err);
    } else {
      db.run('COMMIT');
      resolve(`Incidencia con id ${id} eliminada`);
    }
  });
}

module.exports = { eliminarIncidencia };