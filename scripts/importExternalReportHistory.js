const db = require('../src/server/config/database');
const fs = require('fs');
const path = require('path');
const { get, run } = require('../src/server/utils/dbAsync');

function readImportRows() {
  const base64Index = process.argv.indexOf('--base64');
  const jsonIndex = process.argv.indexOf('--json');
  const fileIndex = process.argv.indexOf('--file');
  const inputModes = [base64Index, jsonIndex, fileIndex].filter((index) => index !== -1);
  if (inputModes.length !== 1) {
    throw new Error('Indica exactamente una fuente: --file, --json o --base64.');
  }
  if ((base64Index !== -1 && !process.argv[base64Index + 1])
    || (jsonIndex !== -1 && !process.argv[jsonIndex + 1])
    || (fileIndex !== -1 && !process.argv[fileIndex + 1])) {
    throw new Error('Falta el contenido o la ruta de la importación.');
  }
  const raw = base64Index !== -1
    ? Buffer.from(process.argv[base64Index + 1], 'base64').toString('utf8')
    : jsonIndex !== -1
      ? process.argv[jsonIndex + 1]
      : fs.readFileSync(path.resolve(process.argv[fileIndex + 1]), 'utf8');
  if (!raw) {
    throw new Error('Falta el contenido o la ruta de la importación.');
  }
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('Los datos importados deben ser un array.');
  }
  return parsed.map((row) => ({
    incidenciaId: Number.parseInt(row.incidenciaId, 10),
    total: Number.parseInt(row.total, 10)
  })).filter((row) => Number.isInteger(row.incidenciaId) && row.incidenciaId > 0 && Number.isInteger(row.total) && row.total > 0);
}

async function main() {
  const rows = readImportRows();
  await db.ready;
  let imported = 0;
  let skipped = 0;

  await run('BEGIN');
  try {
    for (const row of rows) {
      const incidencia = await get('SELECT id FROM incidencias WHERE id = ?', [row.incidenciaId]);
      if (!incidencia) {
        skipped += 1;
        continue;
      }
      await run(
        `INSERT INTO external_report_imports
          (incidencia_id, channel, event_type, source, total, imported_at)
         VALUES (?, 'whatsapp', 'redirect_opened', 'matomo', ?, datetime('now', 'localtime'))
         ON CONFLICT(incidencia_id, channel, event_type, source)
         DO UPDATE SET total = excluded.total, imported_at = excluded.imported_at`,
        [row.incidenciaId, row.total]
      );
      imported += 1;
    }
    await run('COMMIT');
  } catch (error) {
    await run('ROLLBACK').catch(() => {});
    throw error;
  }

  console.log(`Importación de Matomo completada: ${imported} incidencias actualizadas, ${skipped} no encontradas.`);
  db.close();
}

main().catch((error) => {
  console.error(`No se pudo importar el histórico: ${error.message}`);
  db.close();
  process.exitCode = 1;
});
