const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  process.exit(0);
}

const existing = fs.readFileSync(envPath, 'utf8');
const cleaned = existing.replace(/^ADMIN_BOOTSTRAP_PASSWORD\s*=.*$/m, 'ADMIN_BOOTSTRAP_PASSWORD=');
if (cleaned !== existing) {
  fs.writeFileSync(envPath, cleaned, { mode: 0o600 });
}
