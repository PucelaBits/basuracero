const express = require('express');
const router = express.Router();
const db = require('../config/database');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

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
    const sql = `INSERT INTO incidencias (tipo_id, descripcion, latitud, longitud, imagen, nombre, fecha) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`;
    
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

  const countSql = `SELECT COUNT(*) as total FROM incidencias`;
  const dataSql = `
    SELECT i.id, t.nombre as tipo, i.descripcion, i.latitud, i.longitud, i.imagen, i.nombre, i.fecha
    FROM incidencias i
    JOIN tipos_incidencias t ON i.tipo_id = t.id
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

// Eliminar una incidencia
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  const sql = `DELETE FROM incidencias WHERE id = ?`;
  
  db.run(sql, id, function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ message: `Incidencia con id ${id} eliminada` });
  });
});

module.exports = router;