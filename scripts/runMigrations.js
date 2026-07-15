const fs = require('fs').promises;
const path = require('path');
const db = require('../src/server/config/database');
const { all, exec, run } = require('../src/server/utils/dbAsync');

const migrationsDir = path.join(__dirname, '..', 'src', 'server', 'migrations');

function parseAddColumnMigration(sql) {
  const matches = [...sql.matchAll(/ALTER\s+TABLE\s+([A-Za-z_][A-Za-z0-9_]*)\s+ADD\s+COLUMN\s+([A-Za-z_][A-Za-z0-9_]*)/gi)];
  if (matches.length !== 1) {
    return null;
  }
  return { table: matches[0][1], column: matches[0][2] };
}

async function columnExists(table, column) {
  const columns = await all(`PRAGMA table_info("${table}")`);
  return columns.some((item) => item.name === column);
}

async function applyMigration(sql) {
  const addColumn = parseAddColumnMigration(sql);
  if (addColumn && await columnExists(addColumn.table, addColumn.column)) {
    return 'already-applied';
  }
  await exec(sql);
  return 'applied';
}

async function runMigrations({ logger = console } = {}) {
  await db.ready;
  await exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();
  const appliedRows = await all('SELECT name FROM schema_migrations');
  const applied = new Set(appliedRows.map((row) => row.name));
  const results = [];

  for (const file of files) {
    if (applied.has(file)) {
      results.push({ file, status: 'skipped' });
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    const status = await applyMigration(sql);
    await run('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
    results.push({ file, status });
    logger.log(`Migracion ${file}: ${status}`);
  }

  return results;
}

function closeDatabase() {
  return new Promise((resolve, reject) => {
    db.close((error) => error ? reject(error) : resolve());
  });
}

if (require.main === module) {
  runMigrations()
    .then(closeDatabase)
    .catch((error) => {
      console.error('Error al ejecutar migraciones:', error);
      process.exitCode = 1;
      return closeDatabase().catch(() => {});
    });
}

module.exports = {
  parseAddColumnMigration,
  runMigrations
};
