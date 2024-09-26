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
    console.log('Conexión exitosa con la base de datos SQLite');
    console.log('Ruta de la base de datos:', dbPath);
    
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
        estado TEXT DEFAULT 'activa',
        fecha_solucion DATETIME,
        ip TEXT,
        FOREIGN KEY (tipo_id) REFERENCES tipos_incidencias(id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS reportes_solucion (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incidencia_id INTEGER,
        ip TEXT,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (incidencia_id) REFERENCES incidencias(id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS reportes_inadecuado (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incidencia_id INTEGER,
        ip TEXT,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (incidencia_id) REFERENCES incidencias(id)
      )`);

      // Insertar tipos de incidencias predefinidos si la tabla está vacía
      db.get('SELECT COUNT(*) AS count FROM tipos_incidencias', (err, row) => {
        if (err) {
          console.error('Error al verificar la tabla tipos_incidencias:', err.message);
          return;
        }

        if (row.count === 0) {
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
    });
  }
});

module.exports = db;