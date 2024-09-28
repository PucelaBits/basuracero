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

          // Usar una promesa para asegurar que todas las inserciones se completen
          const insertarTipos = new Promise((resolve, reject) => {
            const stmt = db.prepare('INSERT OR IGNORE INTO tipos_incidencias (nombre) VALUES (?)');
            let contador = 0;

            tiposIncidencias.forEach(tipo => {
              stmt.run(tipo, (err) => {
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

      // Verificar y añadir la columna codigo_unico si no existe
      agregarColumnaSiNoExiste(db, 'incidencias', 'codigo_unico', 'TEXT')
        .then(() => {
          console.log('Verificación de columna codigo_unico completada');
        })
        .catch((err) => {
          console.error('Error al verificar o añadir la columna codigo_unico:', err);
        });
     
      // Verificar y añadir la columna barrio si no existe
      agregarColumnaSiNoExiste(db, 'incidencias', 'barrio', 'TEXT')
        .then(() => {
          console.log('Verificación de columna barrio completada');
        })
        .catch((err) => {
          console.error('Error al verificar o añadir la columna barrio:', err);
        });
    });
  }
});

function agregarColumnaSiNoExiste(db, tabla, columna, tipo) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tabla})`, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      const columnaExiste = rows.some(row => row.name === columna);
      
      if (!columnaExiste) {
        db.run(`ALTER TABLE ${tabla} ADD COLUMN ${columna} ${tipo}`, (err) => {
          if (err) {
            reject(err);
          } else {
            console.log(`Columna ${columna} añadida a la tabla ${tabla}`);
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  });
}

module.exports = db;