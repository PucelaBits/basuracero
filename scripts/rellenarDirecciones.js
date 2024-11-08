const db = require('../src/server/config/database');
const axios = require('axios');
require('dotenv').config();

// Función para esperar un tiempo determinado
const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function obtenerDireccion(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=es`;
  
  // Obtener el User-Agent con valores por defecto
  const appName = process.env.APP_NAME || 'BasuraCeroApp';
  let contactEmail = 'app@example.com';
  
  try {
    // Intentar obtener el email del APP_SOCIAL_LINKS
    const socialLinks = process.env.APP_SOCIAL_LINKS;
    if (socialLinks) {
      const emailMatch = socialLinks.match(/mailto:(.*?)"/);
      if (emailMatch && emailMatch[1]) {
        contactEmail = emailMatch[1];
      }
    }
  } catch (error) {
    console.warn('No se pudo obtener el email de configuración, usando valor por defecto');
  }

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': `${appName}/1.0 (${contactEmail})`
      }
    });
    const data = response.data;
    return {
      direccion: data.display_name,
      barrio: data.address.suburb || data.address.neighbourhood || ''
    };
  } catch (error) {
    console.error('Error al obtener la dirección:', error);
    return {
      direccion: 'No se pudo obtener la dirección',
      barrio: ''
    };
  }
}

async function actualizarDirecciones() {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, latitud, longitud FROM incidencias WHERE direccion IS NULL OR direccion = "" OR direccion = "No se pudo obtener la dirección"', async (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      const LIMITE_SOLICITUDES = 100; // Límite de solicitudes por ejecución
      const RETRASO_MS = 1000; // 1 segundo de retraso entre solicitudes

      for (let i = 0; i < Math.min(rows.length, LIMITE_SOLICITUDES); i++) {
        const row = rows[i];
        const { direccion, barrio } = await obtenerDireccion(row.latitud, row.longitud);
        await new Promise((resolve, reject) => {
          db.run('UPDATE incidencias SET direccion = ?, barrio = ? WHERE id = ?', [direccion, barrio, row.id], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        console.log(`Actualizada dirección para incidencia ${row.id}: ${direccion}`);
        
        // Esperar antes de la siguiente solicitud
        await esperar(RETRASO_MS);
      }

      if (rows.length > LIMITE_SOLICITUDES) {
        console.log(`Se alcanzó el límite de ${LIMITE_SOLICITUDES} solicitudes. Ejecute el script nuevamente para continuar.`);
      }

      resolve();
    });
  });
}

actualizarDirecciones()
  .then(() => {
    console.log('Proceso de actualización de direcciones completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error en el proceso de actualización:', error);
    process.exit(1);
  });