require('dotenv').config();
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { obtenerIP } = require('../utils/ip');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const friendlyCaptchaSecret = process.env.friendlycaptcha_secret;
const CIUDAD_LAT_MIN = parseFloat(process.env.CIUDAD_LAT_MIN);
const CIUDAD_LAT_MAX = parseFloat(process.env.CIUDAD_LAT_MAX);
const CIUDAD_LON_MIN = parseFloat(process.env.CIUDAD_LON_MIN);
const CIUDAD_LON_MAX = parseFloat(process.env.CIUDAD_LON_MAX);

// Asegurarse de que la carpeta uploads existe
const uploadsDir = path.join(__dirname, '..', '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configurar Multer para la subida de archivos
const upload = multer({ storage: multer.memoryStorage() }).array('imagenes', 2);

// Configurar el limitador de tasa
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // límite de 200 solicitudes por ventana por IP
  standardHeaders: true, // Devuelve info de rate limit en los headers `RateLimit-*`
  legacyHeaders: false, // Deshabilita los headers `X-RateLimit-*`
  keyGenerator: (req) => {
    return req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
  }
});

// Aplicar el limitador a todas las rutas
router.use(limiter);

// Limitadores específicos para rutas sensibles
const crearIncidenciaLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20, // máximo 20 incidencias por hora por IP
  keyGenerator: (req) => {
    return req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
  }
});

const reporteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 50, // máximo 50 reportes por hora por IP
  keyGenerator: (req) => {
    return req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
  }
});

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

  if (incidencia.latitud < CIUDAD_LAT_MIN || incidencia.latitud > CIUDAD_LAT_MAX ||
      incidencia.longitud < CIUDAD_LON_MIN || incidencia.longitud > CIUDAD_LON_MAX) {
    errores.push('La ubicación está fuera de los límites de la ciudad');
  }

  return errores;
};

function generarCodigoUnico() {
  return crypto.randomBytes(16).toString('hex');
}

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
router.post('/', crearIncidenciaLimiter, (req, res) => {
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: 'Error al subir las imágenes' });
    } else if (err) {
      return res.status(500).json({ error: 'Error interno del servidor' });
    }

    const { tipo_id, descripcion, latitud, longitud, direccion, 'frc-captcha-solution': captchaSolution } = req.body;
    const nombre = req.body.nombre ? req.body.nombre.trim() : '';

    const errores = validarIncidencia({...req.body, nombre});
    if (errores.length > 0) {
      return res.status(400).json({ errores });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Se requiere al menos una imagen' });
    }

    try {
      // Validar el captcha
      const captchaResponse = await axios.post('https://api.friendlycaptcha.com/api/v1/siteverify', {
        solution: captchaSolution,
        secret: friendlyCaptchaSecret
      });

      if (!captchaResponse.data.success) {
        return res.status(400).json({ error: 'Captcha inválido' });
      }

      const ip = obtenerIP(req);
      const codigoUnico = generarCodigoUnico();

      // Insertar la incidencia en la base de datos
      const sql = `INSERT INTO incidencias (tipo_id, descripcion, latitud, longitud, nombre, fecha, direccion, ip, codigo_unico, barrio) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'), ?, ?, ?, ?)`;
      
      db.run(sql, [tipo_id, descripcion, latitud, longitud, nombre, direccion, ip, codigoUnico, req.body.barrio], async function(err) {
        if (err) {
          console.error('Error al insertar en la base de datos:', err);
          return res.status(500).json({ error: err.message });
        }

        const incidenciaId = this.lastID;

        // Procesar y guardar las imágenes
        for (const file of req.files) {
          const filename = `${uuidv4()}.jpg`;
          const filepath = path.join(uploadsDir, filename);
          
          await sharp(file.buffer)
            .rotate()
            .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toFile(filepath);

          // Insertar la imagen en la tabla imagenes_incidencias
          await db.run('INSERT INTO imagenes_incidencias (incidencia_id, ruta_imagen) VALUES (?, ?)', [incidenciaId, filename]);
        }

        res.json({ id: incidenciaId, codigoUnico: codigoUnico });
      });
    } catch (error) {
      console.error('Error al procesar la incidencia:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });
});

// Obtener incidencias paginadas
router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const incluirSolucionadas = req.query.incluirSolucionadas === 'true';
  const tipo = parseInt(req.query.tipo);

  let whereClause = 'WHERE i.estado != ?';
  let params = ['spam'];
  if (!incluirSolucionadas) {
    whereClause += ' AND i.estado = ?';
    params.push('activa');
  }
  if (tipo && !isNaN(tipo)) {
    whereClause += ' AND i.tipo_id = ?';
    params.push(tipo);
  }

  const countSql = `SELECT COUNT(*) as total FROM incidencias i ${whereClause}`;
  const dataSql = `
    SELECT i.id, i.tipo_id, t.nombre as tipo, i.descripcion, i.latitud, i.longitud, i.nombre, i.fecha, i.estado, i.fecha_solucion,
           COALESCE(i.direccion, '') as direccion,
           (SELECT COUNT(*) FROM reportes_solucion WHERE incidencia_id = i.id) as reportes_solucion,
           (SELECT COUNT(*) FROM reportes_inadecuado WHERE incidencia_id = i.id) as reportes_inadecuado
    FROM incidencias i
    JOIN tipos_incidencias t ON i.tipo_id = t.id
    ${whereClause}
    ORDER BY i.fecha DESC
    LIMIT ? OFFSET ?
  `;
  
  db.get(countSql, params, (err, row) => {
    if (err) {
      console.error('Error al obtener el total de incidencias:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
      return;
    }

    const total = row.total;
    const totalPages = Math.ceil(total / limit);

    db.all(dataSql, [...params, limit, offset], (err, rows) => {
      if (err) {
        console.error('Error al obtener incidencias:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
        return;
      }
      
      // Obtener las imágenes para cada incidencia
      const promises = rows.map(incidencia => {
        return new Promise((resolve, reject) => {
          db.all('SELECT ruta_imagen FROM imagenes_incidencias WHERE incidencia_id = ?', [incidencia.id], (err, imagenes) => {
            if (err) {
              reject(err);
            } else {
              incidencia.imagenes = imagenes.map(img => ({
                ruta_imagen: `/uploads/${img.ruta_imagen}`
              }));
              resolve(incidencia);
            }
          });
        });
      });

      Promise.all(promises)
        .then(incidenciasConImagenes => {
          res.json({
            incidencias: incidenciasConImagenes,
            currentPage: page,
            totalPages: totalPages,
            totalItems: total
          });
        })
        .catch(error => {
          console.error('Error al obtener las imágenes de las incidencias:', error);
          res.status(500).json({ error: 'Error interno del servidor' });
        });
    });
  });
});

// Obtener todas las incidencias sin paginación
router.get('/todas', (req, res) => {
  const incluirSolucionadas = req.query.incluirSolucionadas === 'true';

  let whereClause = 'WHERE i.estado != "spam"';
  if (!incluirSolucionadas) {
    whereClause += ' AND i.estado = "activa"';
  }

  const sql = `
    SELECT i.id, i.tipo_id, t.nombre as tipo, i.descripcion, i.latitud, i.longitud, i.nombre, i.fecha, i.estado, i.fecha_solucion,
           COALESCE(i.direccion, '') as direccion,
           (SELECT COUNT(*) FROM reportes_solucion WHERE incidencia_id = i.id) as reportes_solucion,
           (SELECT COUNT(*) FROM reportes_inadecuado WHERE incidencia_id = i.id) as reportes_inadecuado
    FROM incidencias i
    JOIN tipos_incidencias t ON i.tipo_id = t.id
    ${whereClause}
    ORDER BY i.fecha DESC
  `;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error al obtener todas las incidencias:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
      return;
    }
    
    // Obtener las imágenes para cada incidencia
    const promises = rows.map(incidencia => {
      return new Promise((resolve, reject) => {
        db.all('SELECT ruta_imagen FROM imagenes_incidencias WHERE incidencia_id = ?', [incidencia.id], (err, imagenes) => {
          if (err) {
            reject(err);
          } else {
            incidencia.imagenes = imagenes.map(img => ({
              ruta_imagen: `/uploads/${img.ruta_imagen}`
            }));
            resolve(incidencia);
          }
        });
      });
    });

    Promise.all(promises)
      .then(incidenciasConImagenes => {
        res.json({
          incidencias: incidenciasConImagenes
        });
      })
      .catch(error => {
        console.error('Error al obtener las imágenes de las incidencias:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
      });
  });
});

router.get('/ultima-actualizacion', (req, res) => {
  db.get('SELECT fecha FROM incidencias ORDER BY datetime(fecha) DESC LIMIT 1', (err, row) => {
    if (err) {
      console.error('Error al obtener la última actualización:', err);
      return res.status(500).json({ error: 'Error al obtener la última actualización' });
    }
    if (row && row.fecha) {
      // Convertir la fecha a timestamp para el cliente
      const timestamp = new Date(row.fecha).getTime();
      res.json({ ultimaActualizacion: timestamp });
    } else {
      res.json({ ultimaActualizacion: null });
    }
  });
});

router.get('/usuarios/ranking', (req, res) => {
  let minIncidencias = parseInt(req.query.minIncidencias);
  let periodo = req.query.periodo || 'total';
  
  // Validación y sanitización
  if (isNaN(minIncidencias) || minIncidencias < 1) {
    minIncidencias = 1;
  } else if (minIncidencias > 1000) {
    minIncidencias = 1000;
  }

  let fechaInicio, fechaFin = new Date();
  fechaFin.setHours(23, 59, 59, 999); // Fin del día actual

  switch (periodo) {
    case 'semana':
      fechaInicio = new Date(fechaFin);
      fechaInicio.setDate(fechaInicio.getDate() - fechaInicio.getDay() + (fechaInicio.getDay() === 0 ? -6 : 1)); // Lunes de esta semana
      fechaInicio.setHours(0, 0, 0, 0);
      break;
    case 'mes':
      fechaInicio = new Date(fechaFin.getFullYear(), fechaFin.getMonth(), 1); // Primer día del mes actual
      break;
    case 'total':
      fechaInicio = new Date(fechaFin.getFullYear(), 0, 1); // Primer día del año actual
      break;
    default:
      fechaInicio = new Date(0); // Desde el inicio de los tiempos
  }

  const sqlRanking = `
    SELECT 
      COALESCE(LOWER(TRIM(nombre)), 'usuario anónimo') as nombre_lower,
      MAX(TRIM(nombre)) as nombre,
      COUNT(*) as incidencias,
      SUM(CASE WHEN estado = 'solucionada' THEN 1 ELSE 0 END) as incidencias_solucionadas
    FROM incidencias
    WHERE estado != 'spam' AND fecha >= ? AND fecha <= ?
    GROUP BY COALESCE(LOWER(TRIM(nombre)), 'usuario anónimo')
    HAVING COUNT(*) >= ?
    ORDER BY incidencias DESC, nombre_lower
    LIMIT 10
  `;

  const sqlUsuariosUnicos = `
    SELECT COUNT(DISTINCT COALESCE(LOWER(TRIM(nombre)), 'usuario anónimo')) as usuarios_unicos
    FROM incidencias
    WHERE estado != 'spam' AND fecha >= ? AND fecha <= ?
  `;

  const sqlTotalIncidencias = `
    SELECT COUNT(*) as total_incidencias
    FROM incidencias
    WHERE estado != 'spam' AND fecha >= ? AND fecha <= ?
  `;

  const sqlIncidenciasSolucionadas = `
    SELECT COUNT(*) as incidencias_solucionadas
    FROM incidencias
    WHERE estado = 'solucionada' AND fecha >= ? AND fecha <= ?
  `;

  db.all(sqlRanking, [fechaInicio.toISOString(), fechaFin.toISOString(), minIncidencias], (err, rows) => {
    if (err) {
      console.error('Error al obtener el ranking de usuarios:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
      return;
    }

    const ranking = rows.map((row, index) => ({
      posicion: index + 1,
      nombre: row.nombre || 'Usuario anónimo',
      incidencias: row.incidencias,
      incidenciasSolucionadas: row.incidencias_solucionadas
    }));

    db.get(sqlUsuariosUnicos, [fechaInicio.toISOString(), fechaFin.toISOString()], (err, rowUsuarios) => {
      if (err) {
        console.error('Error al obtener el número de usuarios únicos:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
        return;
      }

      db.get(sqlTotalIncidencias, [fechaInicio.toISOString(), fechaFin.toISOString()], (err, rowIncidencias) => {
        if (err) {
          console.error('Error al obtener el total de incidencias:', err);
          res.status(500).json({ error: 'Error interno del servidor' });
          return;
        }

        db.get(sqlIncidenciasSolucionadas, [fechaInicio.toISOString(), fechaFin.toISOString()], (err, rowSolucionadas) => {
          if (err) {
            console.error('Error al obtener el total de incidencias solucionadas:', err);
            res.status(500).json({ error: 'Error interno del servidor' });
            return;
          }

          res.json({ 
            ranking,
            usuariosUnicos: rowUsuarios.usuarios_unicos,
            totalIncidencias: rowIncidencias.total_incidencias,
            incidenciasSolucionadas: rowSolucionadas.incidencias_solucionadas
          });
        });
      });
    });
  });
});

// Obtener incidencia por ID
router.get('/:id', (req, res) => {
  const incidenciaId = req.params.id;

  const sql = `
    SELECT i.id, t.nombre as tipo, i.descripcion, i.latitud, i.longitud, i.nombre, i.fecha, i.estado, i.fecha_solucion,
           COALESCE(i.direccion, '') as direccion,
           (SELECT COUNT(*) FROM reportes_solucion WHERE incidencia_id = i.id) as reportes_solucion,
           (SELECT COUNT(*) FROM reportes_inadecuado WHERE incidencia_id = i.id) as reportes_inadecuado
    FROM incidencias i
    JOIN tipos_incidencias t ON i.tipo_id = t.id
    WHERE i.id = ?
  `;

  db.get(sql, [incidenciaId], (err, row) => {
    if (err) {
      console.error('Error al obtener la incidencia:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
      return;
    }

    if (!row) {
      res.status(404).json({ error: 'Incidencia no encontrada' });
      return;
    }

    // Obtener las imágenes de la incidencia
    db.all('SELECT ruta_imagen FROM imagenes_incidencias WHERE incidencia_id = ?', [incidenciaId], (err, imagenes) => {
      if (err) {
        console.error('Error al obtener las imágenes de la incidencia:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
        return;
      }

      row.imagenes = imagenes.map(img => ({
        ruta_imagen: `/uploads/${img.ruta_imagen}`
      }));

      res.json(row);
    });
  });
});

// Reportar incidencia como solucionada
router.post('/:id/solucionada', reporteLimiter, async (req, res) => {
  const incidenciaId = req.params.id;
  const ip = obtenerIP(req);
  const { 'frc-captcha-solution': captchaSolution, codigoUnico } = req.body;

  try {
    // Validar el captcha
    const captchaResponse = await axios.post('https://api.friendlycaptcha.com/api/v1/siteverify', {
      solution: captchaSolution,
      secret: friendlyCaptchaSecret
    });

    if (!captchaResponse.data.success) {
      return res.status(400).json({ error: 'Captcha inválido' });
    }

    // Verificar si se proporcionó un código único
    if (codigoUnico) {
      db.get('SELECT codigo_unico FROM incidencias WHERE id = ?', [incidenciaId], (err, row) => {
        if (err) {
          return res.status(500).json({ error: 'Error interno del servidor' });
        }
        if (!row) {
          return res.status(404).json({ error: 'Incidencia no encontrada' });
        }
        if (row.codigo_unico === codigoUnico) {
          // El código único coincide, marcar como solucionada inmediatamente
          db.run('UPDATE incidencias SET estado = ?, fecha_solucion = datetime("now") WHERE id = ?', ['solucionada', incidenciaId], (err) => {
            if (err) {
              return res.status(500).json({ error: 'Error al actualizar la incidencia' });
            }
            return res.json({ solucionada: true, mensaje: 'Incidencia marcada como solucionada' });
          });
        } else {
          // El código único no coincide, continuar con el proceso normal de reporte
          procesarReporteSolucion(incidenciaId, ip, res);
        }
      });
    } else {
      // No se proporcionó código único, continuar con el proceso normal de reporte
      procesarReporteSolucion(incidenciaId, ip, res);
    }
  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

function procesarReporteSolucion(incidenciaId, ip, res) {
  // Verificar si el usuario ya ha reportado esta incidencia
  db.get('SELECT * FROM reportes_solucion WHERE incidencia_id = ? AND ip = ?', [incidenciaId, ip], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
    if (row) {
      return res.status(400).json({ error: 'Ya has reportado esta incidencia como solucionada' });
    }

    // Insertar el nuevo reporte
    db.run('INSERT INTO reportes_solucion (incidencia_id, ip) VALUES (?, ?)', [incidenciaId, ip], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Error al registrar el reporte' });
      }

      // Contar el número de reportes para esta incidencia
      db.get('SELECT COUNT(*) as count FROM reportes_solucion WHERE incidencia_id = ?', [incidenciaId], (err, row) => {
        if (err) {
          return res.status(500).json({ error: 'Error al contar los reportes' });
        }

        const reportes_solucion = row.count;

        // Si hay 3 o más reportes, marcar la incidencia como solucionada
        if (reportes_solucion >= 3) {
          db.run('UPDATE incidencias SET estado = ?, fecha_solucion = datetime("now") WHERE id = ?', ['solucionada', incidenciaId], (err) => {
            if (err) {
              return res.status(500).json({ error: 'Error al actualizar la incidencia' });
            }
            res.json({ solucionada: true, reportes_solucion });
          });
        } else {
          res.json({ solucionada: false, reportes_solucion });
        }
      });
    });
  });
}

// Reportar incidencia como contenido inadecuado o spam
router.post('/:id/inadecuado', reporteLimiter, async (req, res) => {
  const incidenciaId = req.params.id;
  const ip = obtenerIP(req);
  const { 'frc-captcha-solution': captchaSolution } = req.body;

  try {
    // Validar el captcha
    const captchaResponse = await axios.post('https://api.friendlycaptcha.com/api/v1/siteverify', {
      solution: captchaSolution,
      secret: friendlyCaptchaSecret
    });

    if (!captchaResponse.data.success) {
      return res.status(400).json({ error: 'Captcha inválido' });
    }

    // Verificar si el usuario ya ha reportado esta incidencia como inadecuada
    const reporteExistente = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM reportes_inadecuado WHERE incidencia_id = ? AND ip = ?', [incidenciaId, ip], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (reporteExistente) {
      return res.status(400).json({ error: 'Ya has reportado esta incidencia como contenido inadecuado' });
    }

    // Insertar el nuevo reporte
    await new Promise((resolve, reject) => {
      db.run('INSERT INTO reportes_inadecuado (incidencia_id, ip) VALUES (?, ?)', [incidenciaId, ip], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Contar el número de reportes para esta incidencia
    const { count } = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM reportes_inadecuado WHERE incidencia_id = ?', [incidenciaId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // Si hay 3 o más reportes, marcar la incidencia como spam
    if (count >= 3) {
      await new Promise((resolve, reject) => {
        db.run('UPDATE incidencias SET estado = ? WHERE id = ?', ['spam', incidenciaId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    res.json({ mensaje: 'Reporte de contenido inadecuado registrado', reportes: count });
  } catch (error) {
    console.error('Error al procesar el reporte de contenido inadecuado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/barrios/ranking', (req, res) => {
  console.log('Recibida solicitud de ranking de barrios');
  let minIncidencias = parseInt(req.query.minIncidencias);
  let periodo = req.query.periodo || 'total';
  const incluirDetalles = req.query.incluirDetalles === 'true';
  
  console.log(`Parámetros: minIncidencias=${minIncidencias}, periodo=${periodo}, incluirDetalles=${incluirDetalles}`);

  // Validación y sanitización
  if (isNaN(minIncidencias) || minIncidencias < 1) {
    minIncidencias = 1;
  } else if (minIncidencias > 1000) {
    minIncidencias = 1000;
  }

  let fechaInicio, fechaFin = new Date();
  fechaFin.setHours(23, 59, 59, 999); // Fin del día actual

  switch (periodo) {
    case 'semana':
      fechaInicio = new Date(fechaFin);
      fechaInicio.setDate(fechaInicio.getDate() - fechaInicio.getDay() + (fechaInicio.getDay() === 0 ? -6 : 1)); // Lunes de esta semana
      fechaInicio.setHours(0, 0, 0, 0);
      break;
    case 'mes':
      fechaInicio = new Date(fechaFin.getFullYear(), fechaFin.getMonth(), 1); // Primer día del mes actual
      break;
    case 'total':
      fechaInicio = new Date(fechaFin.getFullYear(), 0, 1); // Primer día del año actual
      break;
    default:
      fechaInicio = new Date(0); // Desde el inicio de los tiempos
  }

  console.log(`Rango de fechas: ${fechaInicio.toISOString()} - ${fechaFin.toISOString()}`);

  const sqlRanking = `
    SELECT 
      COALESCE(barrio, 'Sin barrio') as nombre,
      COUNT(*) as incidencias,
      SUM(CASE WHEN estado = 'solucionada' THEN 1 ELSE 0 END) as incidencias_solucionadas
    FROM incidencias
    WHERE estado != 'spam' AND fecha >= ? AND fecha <= ?
    GROUP BY COALESCE(barrio, 'Sin barrio')
    HAVING COUNT(*) >= ?
    ORDER BY incidencias DESC
    LIMIT 10
  `;

  console.log('Ejecutando consulta de ranking');
  db.all(sqlRanking, [fechaInicio.toISOString(), fechaFin.toISOString(), minIncidencias], (err, rows) => {
    if (err) {
      console.error('Error al obtener el ranking de barrios:', err);
      res.status(500).json({ error: 'Error interno del servidor', details: err.message });
      return;
    }

    console.log(`Obtenidos ${rows.length} resultados del ranking`);

    const ranking = rows.map((row, index) => ({
      posicion: index + 1,
      nombre: row.nombre,
      incidencias: row.incidencias,
      incidenciasSolucionadas: row.incidencias_solucionadas
    }));

    if (incluirDetalles) {
      console.log('Obteniendo detalles de tipos de incidencias');
      const sqlTiposIncidencias = `
        SELECT 
          COALESCE(i.barrio, 'Sin barrio') as nombre,
          t.nombre as tipo,
          COUNT(*) as total,
          SUM(CASE WHEN i.estado = 'solucionada' THEN 1 ELSE 0 END) as solucionadas
        FROM incidencias i
        JOIN tipos_incidencias t ON i.tipo_id = t.id
        WHERE i.estado != 'spam' AND i.fecha >= ? AND i.fecha <= ?
        GROUP BY COALESCE(i.barrio, 'Sin barrio'), t.nombre
      `;

      db.all(sqlTiposIncidencias, [fechaInicio.toISOString(), fechaFin.toISOString()], (err, rowsTipos) => {
        if (err) {
          console.error('Error al obtener los tipos de incidencias por barrio:', err);
          res.status(500).json({ error: 'Error interno del servidor', details: err.message });
          return;
        }

        console.log(`Obtenidos ${rowsTipos.length} resultados de tipos de incidencias`);

        const tiposIncidenciasPorBarrio = rowsTipos.reduce((acc, row) => {
          if (!acc[row.nombre]) {
            acc[row.nombre] = [];
          }
          acc[row.nombre].push({
            tipo: row.tipo,
            total: row.total,
            solucionadas: row.solucionadas
          });
          return acc;
        }, {});

        ranking.forEach(barrio => {
          barrio.tiposIncidencias = tiposIncidenciasPorBarrio[barrio.nombre] || [];
        });

        finalizarRespuesta(ranking);
      });
    } else {
      finalizarRespuesta(ranking);
    }
  });

  function finalizarRespuesta(ranking) {
    console.log('Finalizando respuesta');
    const sqlBarriosUnicos = `
      SELECT COUNT(DISTINCT COALESCE(barrio, 'Sin barrio')) as barrios_unicos
      FROM incidencias
      WHERE estado != 'spam' AND fecha >= ? AND fecha <= ?
    `;

    const sqlTotalIncidencias = `
      SELECT COUNT(*) as total_incidencias
      FROM incidencias
      WHERE estado != 'spam' AND fecha >= ? AND fecha <= ?
    `;

    const sqlIncidenciasSolucionadas = `
      SELECT COUNT(*) as incidencias_solucionadas
      FROM incidencias
      WHERE estado = 'solucionada' AND fecha >= ? AND fecha <= ?
    `;

    db.get(sqlBarriosUnicos, [fechaInicio.toISOString(), fechaFin.toISOString()], (err, rowBarrios) => {
      if (err) {
        console.error('Error al obtener el número de barrios únicos:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
        return;
      }

      db.get(sqlTotalIncidencias, [fechaInicio.toISOString(), fechaFin.toISOString()], (err, rowIncidencias) => {
        if (err) {
          console.error('Error al obtener el total de incidencias:', err);
          res.status(500).json({ error: 'Error interno del servidor' });
          return;
        }

        db.get(sqlIncidenciasSolucionadas, [fechaInicio.toISOString(), fechaFin.toISOString()], (err, rowSolucionadas) => {
          if (err) {
            console.error('Error al obtener el total de incidencias solucionadas:', err);
            res.status(500).json({ error: 'Error interno del servidor' });
            return;
          }

          res.json({ 
            ranking,
            barriosUnicos: rowBarrios.barrios_unicos,
            totalIncidencias: rowIncidencias.total_incidencias,
            incidenciasSolucionadas: rowSolucionadas.incidencias_solucionadas
          });
          console.log('Respuesta enviada');
        });
      });
    });
  }
});

module.exports = router;