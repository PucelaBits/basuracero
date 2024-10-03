const db = require('../src/server/config/database');
const path = require('path');

const incidenciaId = process.argv[2];
const rutaImagen = process.argv[3];

if (!incidenciaId || !rutaImagen) {
  console.error('Uso: node asignarImagen.js <incidenciaId> <rutaImagen>');
  process.exit(1);
}

// Asegurarse de que la ruta de la imagen sea relativa a la carpeta 'uploads'
const nombreArchivo = path.basename(rutaImagen);

function asignarImagen(incidenciaId, nombreArchivo) {
  return new Promise((resolve, reject) => {
    // Primero, verificar si la incidencia existe
    db.get('SELECT id FROM incidencias WHERE id = ?', [incidenciaId], (err, row) => {
      if (err) {
        reject(`Error al verificar la incidencia: ${err.message}`);
        return;
      }
      if (!row) {
        reject(`No existe una incidencia con el ID ${incidenciaId}`);
        return;
      }

      // Insertar la nueva imagen en la tabla imagenes_incidencias
      db.run('INSERT INTO imagenes_incidencias (incidencia_id, ruta_imagen) VALUES (?, ?)',
        [incidenciaId, nombreArchivo],
        function(err) {
          if (err) {
            reject(`Error al insertar la imagen: ${err.message}`);
          } else {
            resolve(`Imagen asignada correctamente a la incidencia ${incidenciaId}`);
          }
        }
      );
    });
  });
}

asignarImagen(incidenciaId, nombreArchivo)
  .then((mensaje) => {
    console.log(mensaje);
    db.close();
  })
  .catch((error) => {
    console.error(error);
    db.close();
  });