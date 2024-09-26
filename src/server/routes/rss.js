const express = require('express');
const router = express.Router();
const { Feed } = require('feed');
const db = require('../config/database');

router.get('/', (req, res) => {
  const feed = new Feed({
    title: "Basura Cero - Últimas Incidencias",
    description: "Las últimas incidencias reportadas en Basura Cero",
    id: "https://basuracero.pucelabits.org/",
    link: "https://basuracero.pucelabits.org/",
    language: "es",
    image: "https://basuracero.pucelabits.org/favicon.png",
    favicon: "https://basuracero.pucelabits.org/favicon.png",
    copyright: "Basura Cero"
  });

  const sql = `
    SELECT i.id, t.nombre as tipo, i.descripcion, i.latitud, i.longitud, i.imagen, i.nombre, i.fecha, i.estado, i.direccion
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

    rows.forEach(incidencia => {
      const direccion = incidencia.direccion ? incidencia.direccion.split(',').slice(0, 2).join(',') : 'Dirección no disponible';
      feed.addItem({
        title: `${incidencia.tipo}: ${incidencia.descripcion.substring(0, 100)}...`,
        id: `https://basuracero.pucelabits.org/incidencia/${incidencia.id}`,
        link: `https://basuracero.pucelabits.org/incidencia/${incidencia.id}`,
        description: incidencia.descripcion,
        content: `
            <p>📍 ${direccion}</p>
            <p>👤 ${incidencia.nombre}</p>
            <p>💬 ${incidencia.descripcion}</p>
            <img src="https://basuracero.pucelabits.org/uploads/${incidencia.imagen}" alt="${incidencia.tipo}">
        `,
        date: new Date(incidencia.fecha),
        image: `https://basuracero.pucelabits.org/uploads/${incidencia.imagen}`
      });
    });

    res.set('Content-Type', 'application/rss+xml');
    res.send(feed.rss2());
  });
});

module.exports = router;