const express = require('express');
const router = express.Router();
const { Feed } = require('feed');
const db = require('../config/database');
const dotenv = require('dotenv');

dotenv.config();

router.get('/', (req, res) => {
  const feed = new Feed({
    title: process.env.APP_NAME + " - Últimas Incidencias",
    description: "Las últimas incidencias reportadas en " + process.env.APP_NAME,
    id: `${process.env.BASE_URL}/`,
    link: `${process.env.BASE_URL}/`,
    language: "es",
    image: `${process.env.BASE_URL}${process.env.APP_FAVICON_PATH}`,
    favicon: `${process.env.BASE_URL}${process.env.APP_FAVICON_PATH}`,
    copyright: process.env.APP_NAME
  });

  const sql = `
    SELECT i.id, t.nombre as tipo, i.descripcion, i.latitud, i.longitud, i.nombre, i.fecha, i.estado, i.direccion
    FROM incidencias i
    JOIN tipos_incidencias t ON i.tipo_id = t.id
    WHERE i.estado != 'spam'
    ORDER BY i.fecha DESC
    LIMIT 20
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error al obtener incidencias para RSS:', err);
      res.status(500).send('Error interno del servidor');
      return;
    }

    const getImagenes = (incidenciaId) => {
      return new Promise((resolve, reject) => {
        db.all('SELECT ruta_imagen FROM imagenes_incidencias WHERE incidencia_id = ?', [incidenciaId], (err, imagenes) => {
          if (err) {
            reject(err);
          } else {
            resolve(imagenes.map(img => img.ruta_imagen));
          }
        });
      });
    };

    Promise.all(rows.map(async incidencia => {
      const imagenes = await getImagenes(incidencia.id);
      const direccion = incidencia.direccion ? incidencia.direccion.split(',').slice(0, 2).join(',') : 'Dirección no disponible';
      
      let contenidoImagenes = '';
      imagenes.forEach(imagen => {
        contenidoImagenes += `<img src="${process.env.BASE_URL}/uploads/${imagen}" alt="${incidencia.tipo}">`;
      });

      feed.addItem({
        title: `${incidencia.tipo}: ${incidencia.descripcion.substring(0, 100)}...`,
        id: `${process.env.BASE_URL}/incidencia/${incidencia.id}`,
        link: `${process.env.BASE_URL}/incidencia/${incidencia.id}`,
        description: incidencia.descripcion,
        content: `
            <p>📍 ${direccion}</p>
            <p>👤 ${incidencia.nombre}</p>
            <p>💬 ${incidencia.descripcion}</p>
            ${contenidoImagenes}
        `,
        date: new Date(incidencia.fecha),
        image: imagenes.length > 0 ? `${process.env.BASE_URL}/uploads/${imagenes[0]}` : undefined
      });
    })).then(() => {
      res.set('Content-Type', 'application/rss+xml');
      res.send(feed.rss2());
    }).catch(error => {
      console.error('Error al procesar las incidencias para RSS:', error);
      res.status(500).send('Error interno del servidor');
    });
  });
});

// Modificar la ruta del feed RSS de spam
router.get('/spam', (req, res) => {
  const feed = new Feed({
    title: `${process.env.APP_NAME} - Últimos reportes de contenido inadecuado`,
    description: `Los últimos reportes de contenido inadecuado en ${process.env.APP_NAME}`,
    id: `${process.env.BASE_URL}/`,
    link: `${process.env.BASE_URL}/`,
    language: "es",
    image: `${process.env.BASE_URL}${process.env.APP_FAVICON_PATH}`,
    favicon: `${process.env.BASE_URL}${process.env.APP_FAVICON_PATH}`,
    copyright: process.env.APP_NAME
  });

  const sql = `
    SELECT r.id as reporte_id, r.fecha as fecha_reporte,
           i.id as incidencia_id, i.descripcion, i.direccion
    FROM reportes_inadecuado r
    JOIN incidencias i ON r.incidencia_id = i.id
    ORDER BY r.fecha DESC
    LIMIT 50
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error al obtener reportes de spam para RSS:', err);
      res.status(500).send('Error interno del servidor');
      return;
    }

    rows.forEach(reporte => {
      feed.addItem({
        title: `Reporte de contenido inadecuado para incidencia ${reporte.incidencia_id}`,
        id: `${process.env.BASE_URL}/incidencia/${reporte.incidencia_id}`,
        link: `${process.env.BASE_URL}/incidencia/${reporte.incidencia_id}`,
        description: `Reporte de contenido inadecuado para: ${reporte.incidencia_id}`,
        content: `
            <p>🕒 ${new Date(reporte.fecha_reporte).toLocaleString('es-ES')}</p>
            <p><strong>Importante:</strong> El contenido de esta incidencia puede mostrar contenido inadecuado u ofensivo.</p>
        `,
        date: new Date(reporte.fecha_reporte)
      });
    });

    res.set('Content-Type', 'application/rss+xml');
    res.send(feed.rss2());
  });
});

module.exports = router;
