const { eliminarIncidencia } = require('../src/server/utils/incidencias');
const readline = require('readline');

const id = process.argv[2];

if (!id) {
  console.error('Por favor, proporciona el ID de la incidencia a eliminar.');
  process.exit(1);
}

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