const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
let nextEnv = existing.replace(/^ADMIN_ENABLED\s*=.*(?:\n|$)/gm, '');
const secretPattern = /^SESSION_SECRET\s*=\s*(.+)$/m;
const match = nextEnv.match(secretPattern);
const hasConfiguredSecret = Boolean(match && match[1].trim().replace(/^['"]|['"]$/g, '').length >= 32);

if (!hasConfiguredSecret) {
  const secret = crypto.randomBytes(32).toString('hex');
  nextEnv = nextEnv.replace(/^SESSION_SECRET\s*=\s*$/m, '').replace(/\n{3,}/g, '\n\n');
  const separator = nextEnv && !nextEnv.endsWith('\n') ? '\n' : '';
  nextEnv = `${nextEnv}${separator}SESSION_SECRET=${secret}\n`;
  console.log('SESSION_SECRET generado y guardado en .env.');
} else {
  console.log('SESSION_SECRET existente conservado.');
}

if (nextEnv !== existing) {
  fs.writeFileSync(envPath, nextEnv, { mode: 0o600 });
}
fs.chmodSync(envPath, 0o600);
