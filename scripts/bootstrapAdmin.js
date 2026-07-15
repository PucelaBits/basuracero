const fs = require('fs');
const path = require('path');
const db = require('../src/server/config/database');
const { bootstrapAdminIfNeeded } = require('../src/server/admin/service');

async function closeDatabase() {
  await new Promise((resolve, reject) => db.close((error) => error ? reject(error) : resolve()));
}

async function main() {
  await db.ready;
  const result = await bootstrapAdminIfNeeded(console);
  if (result.created && process.env.ADMIN_BOOTSTRAP_STATUS_FILE) {
    const statusPath = path.resolve(process.env.ADMIN_BOOTSTRAP_STATUS_FILE);
    fs.writeFileSync(statusPath, 'created\n', { encoding: 'utf8', mode: 0o600 });
  }
  await closeDatabase();
}

main().catch(async (error) => {
  console.error('No se pudo preparar el administrador inicial:', error.message);
  process.exitCode = 1;
  await closeDatabase().catch(() => {});
});
