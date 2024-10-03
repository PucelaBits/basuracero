const db = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

function eliminarIncidencia(id, borrarImagenes) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      // Primero, verificar si la incidencia existe
      db.get('SELECT id FROM incidencias WHERE id = ?', [id], (err, row) => {
        if (err) {
          db.run('ROLLBACK');
          return reject(err);
        }
        if (!row) {
          db.run('ROLLBACK');
          return reject(new Error(`No se encontró la incidencia con id ${id}`));
        }

        // Proceder con la eliminación
        if (borrarImagenes) {
          eliminarImagenesAsociadas(id, db)
            .then(() => eliminarRegistrosRelacionados(id, db))
            .then(() => eliminarIncidenciaFinal(id, db))
            .then(resolve)
            .catch(error => {
              db.run('ROLLBACK');
              reject(error);
            });
        } else {
          eliminarRegistrosRelacionados(id, db)
            .then(() => eliminarIncidenciaFinal(id, db))
            .then(resolve)
            .catch(error => {
              db.run('ROLLBACK');
              reject(error);
            });
        }
      });
    });
  });
}

function eliminarImagenesAsociadas(id, db) {
  return new Promise((resolve, reject) => {
    db.all('SELECT ruta_imagen FROM imagenes_incidencias WHERE incidencia_id = ?', [id], async (err, rows) => {
      if (err) return reject(err);

      for (const row of rows) {
        const rutaCompleta = path.join(__dirname, '..', '..', '..', 'uploads', row.ruta_imagen);
        try {
          await fs.unlink(rutaCompleta);
        } catch (error) {
          console.error(`Error al eliminar la imagen ${rutaCompleta}:`, error);
        }
      }

      db.run('DELETE FROM imagenes_incidencias WHERE incidencia_id = ?', [id], (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
}

function eliminarRegistrosRelacionados(id, db) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM reportes_solucion WHERE incidencia_id = ?', [id], (err) => {
      if (err) return reject(err);
      db.run('DELETE FROM reportes_inadecuado WHERE incidencia_id = ?', [id], (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
}

function eliminarIncidenciaFinal(id, db) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM incidencias WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Error al eliminar la incidencia:', err);
        db.run('ROLLBACK', () => reject(err));
      } else if (this.changes === 0) {
        console.error('No se encontró la incidencia para eliminar');
        db.run('ROLLBACK', () => reject(new Error('No se encontró la incidencia')));
      } else {
        db.run('COMMIT', (commitErr) => {
          if (commitErr) {
            console.error('Error al hacer commit:', commitErr);
            reject(commitErr);
          } else {
            resolve(`Incidencia con id ${id} eliminada`);
          }
        });
      }
    });
  });
}

module.exports = { eliminarIncidencia };