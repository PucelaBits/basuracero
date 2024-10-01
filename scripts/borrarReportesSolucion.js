const db = require('../src/server/config/database');
const readline = require('readline');

function borrarReportesSolucion(incidenciaId) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      // Borrar los reportes de solución
      db.run('DELETE FROM reportes_solucion WHERE incidencia_id = ?', [incidenciaId], function(err) {
        if (err) {
          db.run('ROLLBACK');
          reject(`Error al borrar los reportes de solución: ${err.message}`);
          return;
        }

        console.log(`Se han borrado ${this.changes} reportes de solución.`);

        // Actualizar el estado de la incidencia si estaba marcada como solucionada
        db.run('UPDATE incidencias SET estado = "activa", fecha_solucion = NULL WHERE id = ? AND estado = "solucionada"', [incidenciaId], function(err) {
          if (err) {
            db.run('ROLLBACK');
            reject(`Error al actualizar el estado de la incidencia: ${err.message}`);
            return;
          }

          if (this.changes > 0) {
            console.log('La incidencia ha sido marcada como activa nuevamente.');
          } else {
            console.log('El estado de la incidencia no ha cambiado.');
          }

          db.run('COMMIT');
          resolve('Operación completada con éxito.');
        });
      });
    });
  });
}

const incidenciaId = process.argv[2];

if (incidenciaId) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(`¿Está seguro de que desea borrar los reportes de solución de la incidencia ${incidenciaId}? (s/n): `, (confirmacion) => {
    if (confirmacion.toLowerCase() === 's') {
      borrarReportesSolucion(incidenciaId)
        .then((mensaje) => {
          console.log(mensaje);
          rl.close();
        })
        .catch((error) => {
          console.error(error);
          rl.close();
        });
    } else {
      console.log('Operación cancelada.');
      rl.close();
    }
  });
} else {
  console.log('Debe proporcionar el ID de la incidencia como argumento.');
}