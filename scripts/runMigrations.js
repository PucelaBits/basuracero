const db = require('../src/server/config/database');
const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'src', 'server', 'migrations');

fs.readdir(migrationsDir, (err, files) => {
  if (err) {
    console.error('Error al leer el directorio de migraciones:', err);
    process.exit(1);
  }

  files.forEach(file => {
    if (file.endsWith('.sql')) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      db.exec(sql, (err) => {
        if (err) {
          console.error(`Error al ejecutar la migración ${file}:`, err);
        } else {
          console.log(`Migración ${file} ejecutada correctamente`);
        }
      });
    }
  });
});