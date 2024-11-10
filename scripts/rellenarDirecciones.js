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
      barrio: data.address.suburb || data.address.neighbourhood || data.address.city || data.address.town || data.address.hamlet || data.address.village || '',
      direccion_json: JSON.stringify(data.address)
    };
  } catch (error) {
    console.error('Error al obtener la dirección:', error);
    return {
      direccion: 'No se pudo obtener la dirección',
      barrio: '',
      direccion_json: null
    };
  }
}

async function actualizarDirecciones() {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, latitud, longitud, barrio, direccion_json FROM incidencias WHERE (barrio IS NULL OR barrio = "") OR (direccion_json IS NULL OR direccion_json = "")', async (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      const LIMITE_SOLICITUDES = 100; // Límite de solicitudes por ejecución
      const RETRASO_MS = 1000; // 1 segundo de retraso entre solicitudes

      for (let i = 0; i < Math.min(rows.length, LIMITE_SOLICITUDES); i++) {
        const row = rows[i];
        const { barrio: nuevoBarrio, direccion_json: nuevoDireccionJson } = await obtenerDireccion(row.latitud, row.longitud);
        
        // Construimos la consulta SQL dinámicamente según los campos que falten
        let updateFields = [];
        let updateValues = [];
        
        if (!row.barrio) {
          updateFields.push('barrio = ?');
          updateValues.push(nuevoBarrio);
        }
        if (!row.direccion_json) {
          updateFields.push('direccion_json = ?');
          updateValues.push(nuevoDireccionJson);
        }
        
        // Agregamos el ID al final de los valores
        updateValues.push(row.id);
        
        await new Promise((resolve, reject) => {
          const updateQuery = `UPDATE incidencias SET ${updateFields.join(', ')} WHERE id = ?`;
          db.run(updateQuery, updateValues, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        
        console.log(`Actualizada incidencia ${row.id}: ${updateFields.join(', ')}`);
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