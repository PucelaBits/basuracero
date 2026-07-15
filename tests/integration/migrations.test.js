const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const sqlite3 = require('sqlite3').verbose();

function openDatabase(filename) {
  const db = new sqlite3.Database(filename);
  return {
    close: () => new Promise((resolve, reject) => db.close((error) => error ? reject(error) : resolve())),
    exec: (sql) => new Promise((resolve, reject) => db.exec(sql, (error) => error ? reject(error) : resolve())),
    all: (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows))),
    get: (sql, params = []) => new Promise((resolve, reject) => db.get(sql, params, (error, row) => error ? reject(error) : resolve(row)))
  };
}

function runMigrations(dbPath) {
  const result = spawnSync(process.execPath, ['scripts/runMigrations.js'], {
    cwd: path.join(__dirname, '..', '..'),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      SQLITE_DB_PATH: dbPath
    },
    encoding: 'utf8'
  });
  if (result.status !== 0) {
    throw new Error(`Fallo de migracion:\n${result.stdout}\n${result.stderr}`);
  }
}

describe('Migraciones SQLite', () => {
  it('crea y repite de forma idempotente una instalacion limpia', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'basuracero-migration-clean-'));
    const dbPath = path.join(tempDir, 'incidencias.sqlite');

    runMigrations(dbPath);
    runMigrations(dbPath);

    const db = openDatabase(dbPath);
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type = 'table'");
    const migrations = await db.get('SELECT COUNT(*) AS total FROM schema_migrations');
    const indexes = await db.all("SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%'");
    const integrity = await db.get('PRAGMA integrity_check');
    const foreignKeyErrors = await db.all('PRAGMA foreign_key_check');
    await db.close();

    expect(tables.map((item) => item.name)).toEqual(expect.arrayContaining([
      'incidencias', 'admin_users', 'admin_sessions', 'admin_audit_log', 'app_settings', 'schema_migrations'
    ]));
    expect(migrations.total).toBe(5);
    expect(indexes.map((item) => item.name)).toContain('idx_incidencias_estado_fecha');
    expect(integrity.integrity_check).toBe('ok');
    expect(foreignKeyErrors).toHaveLength(0);
  });

  it('actualiza una base anterior conservando sus datos', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'basuracero-migration-upgrade-'));
    const dbPath = path.join(tempDir, 'incidencias.sqlite');
    const legacy = openDatabase(dbPath);
    await legacy.exec(`
      CREATE TABLE tipos_incidencias (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL UNIQUE);
      CREATE TABLE incidencias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo_id INTEGER NOT NULL,
        descripcion TEXT NOT NULL,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        estado TEXT DEFAULT 'activa'
      );
      INSERT INTO tipos_incidencias (nombre) VALUES ('Legacy');
      INSERT INTO incidencias (tipo_id, descripcion) VALUES (1, 'Dato que debe conservarse');
    `);
    await legacy.close();

    runMigrations(dbPath);
    runMigrations(dbPath);

    const db = openDatabase(dbPath);
    const columns = await db.all('PRAGMA table_info(incidencias)');
    const preserved = await db.get('SELECT descripcion, tipo_id FROM incidencias WHERE id = 1');
    const migrations = await db.get('SELECT COUNT(*) AS total FROM schema_migrations');
    const integrity = await db.get('PRAGMA integrity_check');
    const foreignKeyErrors = await db.all('PRAGMA foreign_key_check');
    await db.close();

    expect(columns.map((item) => item.name)).toEqual(expect.arrayContaining(['direccion_json', 'fecha_spam']));
    expect(preserved).toEqual({ descripcion: 'Dato que debe conservarse', tipo_id: 1 });
    expect(migrations.total).toBe(5);
    expect(integrity.integrity_check).toBe('ok');
    expect(foreignKeyErrors).toHaveLength(0);
  });
});
