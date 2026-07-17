const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
let nextEnv = existing.replace(/^ADMIN_ENABLED\s*=.*(?:\n|$)/gm, '');
function ensureSecret(name) {
  const pattern = new RegExp(`^${name}\\s*=\\s*(.+)$`, 'm');
  const match = nextEnv.match(pattern);
  const configured = Boolean(match && match[1].trim().replace(/^['"]|['"]$/g, '').length >= 32);
  if (configured) {
    console.log(`${name} existente conservado.`);
    return;
  }

  const secret = crypto.randomBytes(32).toString('hex');
  const emptyPattern = new RegExp(`^${name}\\s*=\\s*$`, 'm');
  nextEnv = nextEnv.replace(emptyPattern, '').replace(/\n{3,}/g, '\n\n');
  const separator = nextEnv && !nextEnv.endsWith('\n') ? '\n' : '';
  nextEnv = `${nextEnv}${separator}${name}=${secret}\n`;
  console.log(`${name} generado y guardado en .env.`);
}

ensureSecret('SESSION_SECRET');

if (nextEnv !== existing) {
  fs.writeFileSync(envPath, nextEnv, { mode: 0o600 });
}
fs.chmodSync(envPath, 0o600);
