const { eliminarIncidencia } = require('../src/server/utils/incidencias');

const id = process.argv[2];

if (!id) {
  console.error('Por favor, proporciona el ID de la incidencia a eliminar.');
  process.exit(1);
}

eliminarIncidencia(id)
  .then((mensaje) => {
    console.log(mensaje);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error al eliminar la incidencia:', error);
    process.exit(1);
  });