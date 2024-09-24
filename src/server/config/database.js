const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../../../data/incidencias.sqlite');

const dataDir = path.join(__dirname, '../../../data');
if (!fs.existsSync(dataDir)){
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con la base de datos', err.message);
  } else {
    //console.log('Conexión exitosa con la base de datos SQLite');
    //console.log('Ruta de la base de datos:', dbPath);
    
    db.serialize(() => {
      // Crear tabla de tipos de incidencias
      db.run(`CREATE TABLE IF NOT EXISTS tipos_incidencias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE
      )`);

      // Verificar si la tabla ya contiene datos
      db.get('SELECT COUNT(*) AS count FROM tipos_incidencias', (err, row) => {
        if (err) {
          console.error('Error al verificar la tabla tipos_incidencias:', err.message);
          return;
        }

        if (row.count === 0) {
          // Insertar tipos de incidencias predefinidos si la tabla está vacía
          const tiposIncidencias = [
            'Basura u objetos abandonados',
            'Vegetación crecida o descuidada',
            'Bache/desperfecto en calzada o acera',
            'Moviliario urbano dañado',
            'Señalización ausente o deficiente',
            'Alumbrado defectuoso o insuficiente',
            'Animal muerto o plaga',
            'Otros'
          ];

          const stmt = db.prepare('INSERT OR IGNORE INTO tipos_incidencias (nombre) VALUES (?)');
          tiposIncidencias.forEach(tipo => stmt.run(tipo));
          stmt.finalize();
        }
      });

      // Verificar si la tabla incidencias existe y tiene los campos necesarios
      db.all("PRAGMA table_info(incidencias)", (err, rows) => {
        if (err) {
          console.error('Error al verificar la tabla incidencias:', err.message);
        } else if (rows.length === 0) {
          // Si la tabla no existe, crearla con todos los campos
          db.run(`CREATE TABLE IF NOT EXISTS incidencias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo_id INTEGER NOT NULL,
            descripcion TEXT NOT NULL,
            latitud REAL,
            longitud REAL,
            imagen TEXT,
            nombre TEXT,
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
            direccion TEXT,  // Añade esta línea
            FOREIGN KEY (tipo_id) REFERENCES tipos_incidencias(id)
          )`);
        } else {
          // Si la tabla existe, verificar y añadir los campos faltantes
          const columns = rows.map(row => row.name);
          if (!columns.includes('nombre')) {
            db.run("ALTER TABLE incidencias ADD COLUMN nombre TEXT DEFAULT ''");
          }
          if (!columns.includes('fecha')) {
            db.run("ALTER TABLE incidencias ADD COLUMN fecha DATETIME DEFAULT CURRENT_TIMESTAMP");
          }
          if (!columns.includes('direccion')) {
            db.run("ALTER TABLE incidencias ADD COLUMN direccion TEXT");
          }
        }
      });

      // Modificar la tabla de incidencias para incluir el estado y la fecha de solución
      db.all("PRAGMA table_info(incidencias)", (err, rows) => {
        if (err) {
          console.error('Error al verificar la estructura de la tabla incidencias:', err.message);
        } else {
          if (Array.isArray(rows)) {
            const columns = rows.map(row => row.name);
            if (!columns.includes('estado')) {
              db.run(`ALTER TABLE incidencias ADD COLUMN estado TEXT DEFAULT 'activa'`);
            }
            if (!columns.includes('fecha_solucion')) {
              db.run(`ALTER TABLE incidencias ADD COLUMN fecha_solucion DATETIME`);
            }
          } else {
            console.error('La estructura de la tabla incidencias no es la esperada:', rows);
          }
        }
      });

      // Crear una nueva tabla para los reportes de solución
      db.run(`CREATE TABLE IF NOT EXISTS reportes_solucion (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incidencia_id INTEGER,
        ip TEXT,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (incidencia_id) REFERENCES incidencias(id)
      )`);

      // Crear una nueva tabla para los reportes de contenido inadecuado
      db.run(`CREATE TABLE IF NOT EXISTS reportes_inadecuado (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incidencia_id INTEGER,
        ip TEXT,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (incidencia_id) REFERENCES incidencias(id)
      )`);

      // Verificar si la tabla incidencias tiene el campo 'ip'
      db.all("PRAGMA table_info(incidencias)", (err, rows) => {
        if (err) {
          console.error('Error al verificar la estructura de la tabla incidencias:', err.message);
        } else {
          if (Array.isArray(rows)) {
            const columns = rows.map(row => row.name);
            if (!columns.includes('ip')) {
              db.run(`ALTER TABLE incidencias ADD COLUMN ip TEXT`);
            }
          } else {
            console.error('La estructura de la tabla incidencias no es la esperada:', rows);
          }
        }
      });
    });
  }
});

module.exports = db;