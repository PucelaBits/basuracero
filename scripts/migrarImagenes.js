const db = require('../src/server/config/database');
const readline = require('readline');

function migrarImagenes() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      // Obtener todas las incidencias con imágenes
      db.each('SELECT id, imagen FROM incidencias WHERE imagen IS NOT NULL', (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        // Verificar si ya existe un registro con el mismo id de incidencia y nombre de imagen
        db.get('SELECT * FROM imagenes_incidencias WHERE incidencia_id = ? AND ruta_imagen = ?', [row.id, row.imagen], (err, existingRow) => {
          if (err) {
            reject(err);
            return;
          }

          if (!existingRow) {
            // Insertar la imagen en la nueva tabla solo si no existe
            db.run('INSERT INTO imagenes_incidencias (incidencia_id, ruta_imagen) VALUES (?, ?)', [row.id, row.imagen], (err) => {
              if (err) {
                reject(err);
              }
            });
          }
        });
      }, (err, count) => {
        if (err) {
          db.run('ROLLBACK');
          reject(err);
        } else {
          db.run('COMMIT');
          console.log(`Proceso de migración completado. Se revisaron ${count} imágenes.`);
          resolve();
        }
      });
    });
  });
}

function preguntarBorrarColumna() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('¿Desea eliminar la columna "imagen" de la tabla "incidencias"? (s/n): ', (respuesta) => {
      rl.close();
      resolve(respuesta.toLowerCase() === 's');
    });
  });
}

function borrarColumnaImagen() {
  return new Promise((resolve, reject) => {
    db.run('ALTER TABLE incidencias DROP COLUMN imagen', (err) => {
      if (err) {
        reject(err);
      } else {
        console.log('Columna "imagen" eliminada de la tabla "incidencias"');
        resolve();
      }
    });
  });
}

migrarImagenes()
  .then(() => console.log('Migración completada'))
  .then(preguntarBorrarColumna)
  .then((borrar) => {
    if (borrar) {
      return borrarColumnaImagen();
    }
  })
  .catch((err) => console.error('Error en la migración:', err))
  .finally(() => db.close());