const express = require('express');
const router = express.Router();
const db = require('../config/database');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { obtenerIP } = require('../utils/ip');

// Asegurarse de que la carpeta uploads existe
const uploadsDir = path.join(__dirname, '..', '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configurar Multer para la subida de archivos
const upload = multer({ storage: multer.memoryStorage() });

// Función de validación
const validarIncidencia = (incidencia) => {
  const errores = [];
  if (!incidencia.tipo_id) errores.push('El tipo de incidencia es requerido');
  if (!incidencia.descripcion) errores.push('La descripción es requerida');
  if (!incidencia.latitud) errores.push('La latitud es requerida');
  if (!incidencia.longitud) errores.push('La longitud es requerida');
  if (!incidencia.nombre) errores.push('El nombre es requerido');
  
  // Validaciones adicionales
  if (incidencia.descripcion && incidencia.descripcion.length > 500) 
    errores.push('La descripción no debe exceder los 500 caracteres');
  if (incidencia.nombre && incidencia.nombre.length > 100) 
    errores.push('El nombre no debe exceder los 100 caracteres');
  if (incidencia.latitud && (incidencia.latitud < -90 || incidencia.latitud > 90)) 
    errores.push('La latitud debe estar entre -90 y 90');
  if (incidencia.longitud && (incidencia.longitud < -180 || incidencia.longitud > 180)) 
    errores.push('La longitud debe estar entre -180 y 180');

  return errores;
};

// Obtener tipos de incidencias
router.get('/tipos', (req, res) => {
  const sql = `SELECT * FROM tipos_incidencias`;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Crear una nueva incidencia
router.post('/', upload.single('imagen'), async (req, res) => {
  const { tipo_id, descripcion, latitud, longitud, nombre } = req.body;
  
  const errores = validarIncidencia(req.body);
  if (errores.length > 0) {
    return res.status(400).json({ errores });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'La imagen es obligatoria' });
  }

  try {
    console.log('Procesando imagen...');
    // Procesar y guardar la imagen
    const filename = `${uuidv4()}.jpg`;
    const filepath = path.join(uploadsDir, filename);
    
    await sharp(req.file.buffer)
      .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(filepath);

    console.log('Imagen procesada y guardada.');

    // Insertar la incidencia en la base de datos
    const sql = `INSERT INTO incidencias (tipo_id, descripcion, latitud, longitud, imagen, nombre, fecha) VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`;
    
    db.run(sql, [tipo_id, descripcion, latitud, longitud, filename, nombre], function(err) {
      if (err) {
        console.error('Error al insertar en la base de datos:', err);
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID });
    });
  } catch (error) {
    console.error('Error al procesar la incidencia:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener incidencias paginadas
router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const incluirSolucionadas = req.query.incluirSolucionadas === 'true';

  const whereClause = incluirSolucionadas ? '' : 'WHERE i.estado = "activa"';

  const countSql = `SELECT COUNT(*) as total FROM incidencias i ${whereClause}`;
  const dataSql = `
    SELECT i.id, t.nombre as tipo, i.descripcion, i.latitud, i.longitud, i.imagen, i.nombre, i.fecha, i.estado, i.fecha_solucion,
           (SELECT COUNT(*) FROM reportes_solucion WHERE incidencia_id = i.id) as reportes_solucion
    FROM incidencias i
    JOIN tipos_incidencias t ON i.tipo_id = t.id
    ${whereClause}
    ORDER BY i.fecha DESC
    LIMIT ? OFFSET ?
  `;
  
  db.get(countSql, [], (err, row) => {
    if (err) {
      console.error('Error al obtener el total de incidencias:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
      return;
    }

    const total = row.total;
    const totalPages = Math.ceil(total / limit);

    db.all(dataSql, [limit, offset], (err, rows) => {
      if (err) {
        console.error('Error al obtener incidencias:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
        return;
      }
      
      const incidenciasConImagenes = rows.map(incidencia => ({
        ...incidencia,
        imagen: incidencia.imagen ? `/uploads/${incidencia.imagen}` : null
      }));

      res.json({
        incidencias: incidenciasConImagenes,
        currentPage: page,
        totalPages: totalPages,
        totalItems: total
      });
    });
  });
});

// Reportar incidencia como solucionada
router.post('/:id/solucionada', async (req, res) => {
  const incidenciaId = req.params.id;
  const ip = obtenerIP(req);

  try {
    // Verificar si el usuario ya ha reportado esta incidencia
    const reporteExistente = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM reportes_solucion WHERE incidencia_id = ? AND ip = ?', [incidenciaId, ip], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (reporteExistente) {
      return res.status(400).json({ error: 'Ya has reportado esta incidencia como solucionada' });
    }

    // Insertar el nuevo reporte
    await new Promise((resolve, reject) => {
      db.run('INSERT INTO reportes_solucion (incidencia_id, ip) VALUES (?, ?)', [incidenciaId, ip], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Contar el número de reportes para esta incidencia
    const { count } = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM reportes_solucion WHERE incidencia_id = ?', [incidenciaId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // Si hay 3 o más reportes, marcar la incidencia como solucionada
    if (count >= 3) {
      await new Promise((resolve, reject) => {
        db.run('UPDATE incidencias SET estado = ?, fecha_solucion = datetime("now") WHERE id = ?', ['solucionada', incidenciaId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    res.json({ mensaje: 'Reporte de solución registrado', reportes: count });
  } catch (error) {
    console.error('Error al reportar incidencia como solucionada:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;