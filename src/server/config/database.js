const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.SQLITE_DB_PATH
  ? path.resolve(process.env.SQLITE_DB_PATH)
  : path.join(__dirname, '..', '..', '..', 'data', 'incidencias.sqlite');

const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)){
    fs.mkdirSync(dataDir, { recursive: true });
}

let resolveReady;
let rejectReady;
const ready = new Promise((resolve, reject) => {
  resolveReady = resolve;
  rejectReady = reject;
});

function getInitialTiposIncidencias() {
  const tiposIncidenciasStr = process.env.TIPOS_INCIDENCIAS_INICIALES ||
    '[{"tipo": "Basura u objetos abandonados", "icono": "mdi-trash-can"}, {"tipo": "Vegetación crecida o descuidada", "icono": "mdi-tree"}, {"tipo": "Bache/desperfecto en calzada o acera", "icono": "mdi-road-variant"}, {"tipo": "Mobiliario urbano dañado", "icono": "mdi-bench-back"}, {"tipo": "Señalización ausente o deficiente", "icono": "mdi-sign-direction"}, {"tipo": "Alumbrado defectuoso o insuficiente", "icono": "mdi-lightbulb-off"}, {"tipo": "Animal muerto o plaga", "icono": "mdi-bug"}, {"tipo": "Otros", "icono": "mdi-circle"}]';

  try {
    const tiposIncidencias = JSON.parse(tiposIncidenciasStr);
    if (!Array.isArray(tiposIncidencias)) {
      throw new Error('TIPOS_INCIDENCIAS_INICIALES debe ser un array JSON');
    }
    return tiposIncidencias;
  } catch (error) {
    console.error('Error al parsear TIPOS_INCIDENCIAS_INICIALES:', error);
    return [];
  }
}

function backfillTipoIcons(done) {
  const tiposIncidencias = getInitialTiposIncidencias();
  if (!tiposIncidencias.length) {
    done();
    return;
  }

  const stmt = db.prepare(
    `UPDATE tipos_incidencias
     SET icono = ?
     WHERE lower(nombre) = lower(?)
       AND (icono IS NULL OR icono = '' OR icono = 'mdi-circle')`
  );
  let pending = tiposIncidencias.length;

  tiposIncidencias.forEach((tipo) => {
    stmt.run(tipo.icono || 'mdi-circle', tipo.tipo, (updateErr) => {
      if (updateErr) {
        stmt.finalize(() => rejectReady(updateErr));
        return;
      }

      pending -= 1;
      if (pending === 0) {
        stmt.finalize((finalizeErr) => {
          if (finalizeErr) {
            rejectReady(finalizeErr);
            return;
          }
          done();
        });
      }
    });
  });
}

function ensureTipoIconColumn(seedTipos) {
  db.all(`PRAGMA table_info(tipos_incidencias)`, (pragmaErr, columns = []) => {
    if (pragmaErr) {
      rejectReady(pragmaErr);
      return;
    }

    const hasIconColumn = columns.some((column) => column.name === 'icono');
    if (hasIconColumn) {
      seedTipos();
      return;
    }

    db.run(`ALTER TABLE tipos_incidencias ADD COLUMN icono TEXT NOT NULL DEFAULT 'mdi-circle'`, (alterErr) => {
      if (alterErr) {
        rejectReady(alterErr);
        return;
      }
      seedTipos();
    });
  });
}

function ensureIndexes(done) {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_incidencias_estado_fecha ON incidencias(estado, fecha);
    CREATE INDEX IF NOT EXISTS idx_incidencias_tipo_id ON incidencias(tipo_id);
    CREATE INDEX IF NOT EXISTS idx_reportes_solucion_incidencia ON reportes_solucion(incidencia_id);
    CREATE INDEX IF NOT EXISTS idx_reportes_inadecuado_incidencia ON reportes_inadecuado(incidencia_id);
    CREATE INDEX IF NOT EXISTS idx_imagenes_incidencia ON imagenes_incidencias(incidencia_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_username_nocase ON admin_users(lower(username));
    CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_log(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_admin_sessions_expired ON admin_sessions(expired);
  `, (indexError) => {
    if (indexError) {
      rejectReady(indexError);
      return;
    }
    done();
  });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con la base de datos', err.message);
    rejectReady(err);
  } else {
    db.serialize(() => {
      db.run('PRAGMA foreign_keys = ON');
      db.run('PRAGMA busy_timeout = 5000');
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
        direccion_json TEXT,
        barrio TEXT,
        estado TEXT DEFAULT 'activa',
        fecha_solucion DATETIME,
        fecha_spam DATETIME,
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

      db.run(`CREATE TABLE IF NOT EXISTS external_report_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incidencia_id INTEGER NOT NULL,
        channel TEXT NOT NULL,
        event_type TEXT NOT NULL,
        reporter_fingerprint TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (incidencia_id) REFERENCES incidencias(id) ON DELETE CASCADE,
        UNIQUE (incidencia_id, reporter_fingerprint)
      )`);
      db.run('CREATE INDEX IF NOT EXISTS idx_external_report_events_ranking ON external_report_events(channel, incidencia_id)');

      db.run(`CREATE TABLE IF NOT EXISTS external_report_imports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incidencia_id INTEGER NOT NULL,
        channel TEXT NOT NULL,
        event_type TEXT NOT NULL,
        source TEXT NOT NULL,
        total INTEGER NOT NULL CHECK (total >= 0),
        imported_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (incidencia_id) REFERENCES incidencias(id) ON DELETE CASCADE,
        UNIQUE (incidencia_id, channel, event_type, source)
      )`);
      db.run('CREATE INDEX IF NOT EXISTS idx_external_report_imports_ranking ON external_report_imports(channel, incidencia_id)');

      // Crear la tabla imagenes_incidencias si no existe
      db.run(`CREATE TABLE IF NOT EXISTS imagenes_incidencias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incidencia_id INTEGER NOT NULL,
        ruta_imagen TEXT NOT NULL,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (incidencia_id) REFERENCES incidencias(id) ON DELETE CASCADE
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        must_change_password INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        last_login_at DATETIME,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS admin_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_user_id INTEGER,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        before_json TEXT,
        after_json TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_user_id) REFERENCES admin_users(id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS admin_sessions (
        sid TEXT PRIMARY KEY,
        expired INTEGER NOT NULL,
        sess TEXT NOT NULL
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);

      ensureIndexes(() => ensureTipoIconColumn(() => {
        // Insertar tipos de incidencias predefinidos si la tabla está vacía
        db.get('SELECT COUNT(*) AS count FROM tipos_incidencias', (err, row) => {
          if (err) {
            console.error('Error al verificar la tabla tipos_incidencias:', err.message);
            rejectReady(err);
            return;
          }

          if (row.count === 0) {
            const tiposIncidencias = getInitialTiposIncidencias();

            if (tiposIncidencias.length === 0) {
              console.warn('No se han definido tipos de incidencias iniciales en TIPOS_INCIDENCIAS_INICIALES');
              resolveReady();
              return;
            }

            const stmt = db.prepare('INSERT OR IGNORE INTO tipos_incidencias (nombre, icono) VALUES (?, ?)');
            let pending = tiposIncidencias.length;

            tiposIncidencias.forEach(tipo => {
              stmt.run(tipo.tipo, tipo.icono || 'mdi-circle', (insertErr) => {
                if (insertErr) {
                  console.error('Error al insertar tipos de incidencias:', insertErr);
                  rejectReady(insertErr);
                  return;
                }

                pending -= 1;
                if (pending === 0) {
                  stmt.finalize((finalizeErr) => {
                    if (finalizeErr) {
                      rejectReady(finalizeErr);
                      return;
                    }

                    if (process.env.NODE_ENV !== 'test') {
                      console.log('Todos los tipos de incidencias han sido insertados');
                    }
                    resolveReady();
                  });
                }
              });
            });

            return;
          }

          backfillTipoIcons(resolveReady);
        });
      }));
    });
  }
});

db.dbPath = dbPath;
db.ready = ready;

module.exports = db;
