const db = require('../src/server/config/database');
const axios = require('axios');

async function obtenerBarrio(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=es`;
    const response = await axios.get(url);
    const data = response.data;
    return data.address.neighbourhood || data.address.suburb || '';
  } catch (error) {
    console.error('Error al obtener el barrio:', error);
    return '';
  }
}

async function actualizarBarrios() {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, latitud, longitud FROM incidencias WHERE barrio IS NULL OR barrio = ""', async (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      for (const row of rows) {
        const barrio = await obtenerBarrio(row.latitud, row.longitud);
        if (barrio) {
          await new Promise((resolve, reject) => {
            db.run('UPDATE incidencias SET barrio = ? WHERE id = ?', [barrio, row.id], (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
          console.log(`Actualizado barrio para incidencia ${row.id}: ${barrio}`);
        }
      }

      resolve();
    });
  });
}

actualizarBarrios()
  .then(() => {
    console.log('Proceso de actualización de barrios completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error durante la actualización de barrios:', error);
    process.exit(1);
  });