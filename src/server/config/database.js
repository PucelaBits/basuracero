const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', '..', '..', 'data', 'incidencias.sqlite');

const dataDir = path.join(__dirname, '..', '..', '..', 'data');
if (!fs.existsSync(dataDir)){
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con la base de datos', err.message);
  } else {
    
    db.serialize(() => {
      // Crear todas las tablas necesarias
      db.run(`CREATE TABLE IF NOT EXISTS tipos_incidencias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS incidencias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo_id INTEGER NOT NULL,
        descripcion TEXT NOT NULL,
        latitud REAL,
        longitud REAL,
        imagen TEXT,
        nombre TEXT,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        direccion TEXT,
        barrio TEXT,
        estado TEXT DEFAULT 'activa',
        fecha_solucion DATETIME,
        ip TEXT,
        codigo_unico TEXT,
        FOREIGN KEY (tipo_id) REFERENCES tipos_incidencias(id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS reportes_solucion (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incidencia_id INTEGER,
        ip TEXT,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        usuario TEXT,
        FOREIGN KEY (incidencia_id) REFERENCES incidencias(id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS reportes_inadecuado (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incidencia_id INTEGER,
        ip TEXT,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (incidencia_id) REFERENCES incidencias(id)
      )`);

      // Crear la tabla imagenes_incidencias si no existe
      db.run(`CREATE TABLE IF NOT EXISTS imagenes_incidencias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incidencia_id INTEGER NOT NULL,
        ruta_imagen TEXT NOT NULL,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (incidencia_id) REFERENCES incidencias(id) ON DELETE CASCADE
      )`);

      // Insertar tipos de incidencias predefinidos si la tabla está vacía
      db.get('SELECT COUNT(*) AS count FROM tipos_incidencias', (err, row) => {
        if (err) {
          console.error('Error al verificar la tabla tipos_incidencias:', err.message);
          return;
        }

        if (row.count === 0) {
          const tiposIncidenciasStr = process.env.TIPOS_INCIDENCIAS_INICIALES || 
            '[{"tipo": "Basura u objetos abandonados", "icono": "mdi-trash-can"}, {"tipo": "Vegetación crecida o descuidada", "icono": "mdi-tree"}, {"tipo": "Bache/desperfecto en calzada o acera", "icono": "mdi-road-variant"}, {"tipo": "Mobiliario urbano dañado", "icono": "mdi-bench-back"}, {"tipo": "Señalización ausente o deficiente", "icono": "mdi-sign-direction"}, {"tipo": "Alumbrado defectuoso o insuficiente", "icono": "mdi-lightbulb-off"}, {"tipo": "Animal muerto o plaga", "icono": "mdi-bug"}, {"tipo": "Otros", "icono": "mdi-circle"}]';
            
          let tiposIncidencias;
          try {
            tiposIncidencias = JSON.parse(tiposIncidenciasStr);
            if (!Array.isArray(tiposIncidencias)) {
              throw new Error('TIPOS_INCIDENCIAS_INICIALES debe ser un array JSON');
            }
          } catch (error) {
            console.error('Error al parsear TIPOS_INCIDENCIAS_INICIALES:', error);
            tiposIncidencias = [];
          }

          if (tiposIncidencias.length === 0) {
            console.warn('No se han definido tipos de incidencias iniciales en TIPOS_INCIDENCIAS_INICIALES');
            return;
          }

          // Usar una promesa para asegurar que todas las inserciones se completen
          const insertarTipos = new Promise((resolve, reject) => {
            const stmt = db.prepare('INSERT OR IGNORE INTO tipos_incidencias (nombre) VALUES (?)');
            let contador = 0;

            tiposIncidencias.forEach(tipo => {
              stmt.run(tipo.tipo, (err) => {
                if (err) reject(err);
                contador++;
                if (contador === tiposIncidencias.length) {
                  stmt.finalize();
                  resolve();
                }
              });
            });
          });

          insertarTipos
            .then(() => console.log('Todos los tipos de incidencias han sido insertados'))
            .catch(err => console.error('Error al insertar tipos de incidencias:', err));
        }
      });
    });
  }
});

module.exports = db;