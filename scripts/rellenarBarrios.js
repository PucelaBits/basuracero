const db = require('../src/server/config/database');
const axios = require('axios');

// Configuración del rate limit
const RATE_LIMIT = 1000; // 1 segundo entre solicitudes

async function obtenerBarrio(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=es`;
    const response = await axios.get(url);
    const data = response.data;
    return data.address.suburb || data.address.neighbourhood || '';
  } catch (error) {
    console.error('Error al obtener el barrio:', error);
    return '';
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function actualizarBarrios(forzarActualizacion = false) {
  return new Promise((resolve, reject) => {
    const query = forzarActualizacion
      ? 'SELECT id, latitud, longitud FROM incidencias'
      : 'SELECT id, latitud, longitud FROM incidencias WHERE barrio IS NULL OR barrio = ""';

    db.all(query, async (err, rows) => {
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
        // Esperar antes de la siguiente solicitud
        await sleep(RATE_LIMIT);
      }

      resolve();
    });
  });
}

// Verificar si se debe forzar la actualización
const forzarActualizacion = process.argv.includes('-f') || process.argv.includes('--forzar');

actualizarBarrios(forzarActualizacion)
  .then(() => {
    console.log('Proceso de actualización de barrios completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error durante la actualización de barrios:', error);
    process.exit(1);
  });