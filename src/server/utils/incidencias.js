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
      if (err) {
        console.error('Error al consultar imágenes:', err);
        return reject(err);
      }

      try {
        // Process all image deletions
        const deletePromises = rows.map(async (row) => {
          const rutaCompleta = path.join(__dirname, '..', '..', '..', 'uploads', row.ruta_imagen);
          try {
            await fs.unlink(rutaCompleta);
            return { success: true, path: rutaCompleta };
          } catch (error) {
            if (error.code !== 'ENOENT') { // Ignore if file doesn't exist
              throw new Error(`Error al eliminar la imagen ${rutaCompleta}: ${error.message}`);
            }
            return { success: true, path: rutaCompleta, warning: 'File did not exist' };
          }
        });

        // Wait for all deletions to complete
        const results = await Promise.all(deletePromises);
        
        // Check if any deletions failed
        const failures = results.filter(r => !r.success);
        if (failures.length > 0) {
          throw new Error(`Failed to delete ${failures.length} images`);
        }

        // If all files were deleted successfully, remove database records
        db.run('DELETE FROM imagenes_incidencias WHERE incidencia_id = ?', [id], (dbErr) => {
          if (dbErr) {
            console.error('Error al eliminar registros de imágenes:', dbErr);
            return reject(dbErr);
          }
          resolve(results);
        });
      } catch (error) {
        console.error('Error en el proceso de eliminación de imágenes:', error);
        reject(error);
      }
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