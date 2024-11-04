const db = require('../src/server/config/database');
const { eliminarIncidencia } = require('../src/server/utils/incidencias');
const readline = require('readline');

const comando = process.argv[2];
let id, tipoId;

if (!comando) {
  console.error('Por favor, proporciona un comando: remove, edit-tipo');
  process.exit(1);
}

// Procesar argumentos según el comando
switch (comando) {
  case 'edit-tipo':
    id = process.argv[3];
    tipoId = process.argv[4];
    if (!id || !tipoId) {
      console.error('Uso: node gestionarIncidencias.js edit-tipo <id_incidencia> <id_tipo_nuevo>');
      process.exit(1);
    }
    break;
  case 'remove':
    id = process.argv[3];
    if (!id) {
      console.error('Uso: node gestionarIncidencias.js remove <id_incidencia>');
      process.exit(1);
    }
    break;
}

switch (comando) {
  case 'edit-tipo':
    confirmarYEditarTipo(id, tipoId);
    break;
  case 'remove':
    confirmarYBorrarIncidencia(id);
    break;
  default:
    console.error('Comando no reconocido');
    process.exit(1);
}

function confirmarYEditarTipo(incidenciaId, nuevoTipoId) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Obtener información actual de la incidencia y del nuevo tipo
  db.get(
    `SELECT i.tipo_id, t_actual.nombre as nombre_actual, t_nuevo.nombre as nombre_nuevo 
     FROM incidencias i 
     JOIN tipos_incidencias t_actual ON i.tipo_id = t_actual.id 
     LEFT JOIN tipos_incidencias t_nuevo ON t_nuevo.id = ?
     WHERE i.id = ?`,
    [nuevoTipoId, incidenciaId],
    (err, row) => {
      if (err) {
        console.error('Error al obtener información:', err.message);
        rl.close();
        process.exit(1);
      }
      if (!row || !row.nombre_nuevo) {
        console.error('No se encontró la incidencia o el nuevo tipo especificado');
        rl.close();
        process.exit(1);
      }

      rl.question(
        `¿Confirmas que quieres cambiar el tipo de la incidencia ${incidenciaId} de "${row.nombre_actual}" a "${row.nombre_nuevo}"? (s/n): `,
        (respuesta) => {
          if (respuesta.toLowerCase() === 's') {
            db.run(
              'UPDATE incidencias SET tipo_id = ? WHERE id = ?',
              [nuevoTipoId, incidenciaId],
              function(err) {
                if (err) {
                  console.error('Error al actualizar el tipo:', err.message);
                  rl.close();
                  process.exit(1);
                }
                console.log(`Tipo de incidencia actualizado correctamente de "${row.nombre_actual}" a "${row.nombre_nuevo}"`);
                rl.close();
                process.exit(0);
              }
            );
          } else {
            console.log('Operación cancelada.');
            rl.close();
            process.exit(0);
          }
        }
      );
    }
  );
}

function confirmarYBorrarIncidencia(id) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(`¿Estás seguro de que quieres eliminar la incidencia con ID ${id}? (s/n): `, (respuesta) => {
    if (respuesta.toLowerCase() === 's') {
      rl.question('¿Quieres eliminar también las imágenes asociadas? (s/n): ', (respuestaImagenes) => {
        const borrarImagenes = respuestaImagenes.toLowerCase() === 's';
        
        eliminarIncidencia(id, borrarImagenes)
          .then((mensaje) => {
            console.log(mensaje);
            rl.close();
            process.exit(0);
          })
          .catch((error) => {
            console.error('Error al eliminar la incidencia:', error);
            rl.close();
            process.exit(1);
          });
      });
    } else {
      console.log('Operación cancelada.');
      rl.close();
      process.exit(0);
    }
  });
}