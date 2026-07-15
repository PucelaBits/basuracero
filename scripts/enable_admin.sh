#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

chmod 600 .env data/incidencias.sqlite data/.admin-enabled 2>/dev/null || true

marker_preexisted=false
if [[ -f data/.admin-enabled ]]; then
  marker_preexisted=true
fi
activation_completed=false

restore_on_error() {
  exit_code=$?
  unset ADMIN_BOOTSTRAP_PASSWORD ADMIN_BOOTSTRAP_STATUS_FILE 2>/dev/null || true
  if [[ $exit_code -ne 0 && "$activation_completed" != true ]]; then
    echo "La activacion no se completo; restaurando el servicio publico anterior..." >&2
    if [[ "$marker_preexisted" != true ]]; then
      node -e "require('fs').rmSync('data/.admin-enabled', { force: true })" 2>/dev/null || true
    fi
    docker compose up -d >/dev/null 2>&1 || true
  fi
}
trap restore_on_error EXIT

for command_name in docker node; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Error: se necesita $command_name para activar el panel." >&2
    exit 1
  fi
done

if ! docker compose version >/dev/null 2>&1; then
  echo "Error: se necesita Docker Compose v2 (docker compose)." >&2
  exit 1
fi

docker compose stop basuracero-app >/dev/null 2>&1 || true

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="backups/admin-enable-$timestamp"
mkdir -p "$backup_dir"

if [[ -f data/incidencias.sqlite ]]; then
  cp data/incidencias.sqlite "$backup_dir/incidencias.sqlite"
fi
if [[ -d uploads ]]; then
  cp -R uploads "$backup_dir/uploads"
fi
if [[ -f .env ]]; then
  cp .env "$backup_dir/env.backup"
fi

node scripts/ensureAdminEnv.js
node -e "require('./src/server/admin/activation').enableAdmin()"
base_url="$(node -e "require('dotenv').config(); process.stdout.write(process.env.BASE_URL || 'http://localhost:5050')")"
bootstrap_username="$(node -e "require('dotenv').config(); process.stdout.write(process.env.ADMIN_BOOTSTRAP_USERNAME || 'admin')")"

status_file="data/.admin-bootstrap-created"
node -e "require('fs').rmSync('data/.admin-bootstrap-created', { force: true })"
temporary_password="BCero-$(node -e "process.stdout.write(require('crypto').randomBytes(12).toString('base64url'))")!"

echo "Construyendo la version actualizada..."
docker compose build

echo "Aplicando migraciones y preparando el administrador inicial..."
export ADMIN_BOOTSTRAP_PASSWORD="$temporary_password"
export ADMIN_BOOTSTRAP_STATUS_FILE="/app/data/.admin-bootstrap-created"
docker compose run --rm \
  -e ADMIN_BOOTSTRAP_PASSWORD \
  -e ADMIN_BOOTSTRAP_STATUS_FILE \
  basuracero-app npm run admin:bootstrap
unset ADMIN_BOOTSTRAP_PASSWORD ADMIN_BOOTSTRAP_STATUS_FILE

node scripts/clearAdminBootstrapEnv.js
docker compose up -d
activation_completed=true

echo
echo "Panel administrativo activado."
echo "URL: ${base_url%/}/admin"
if [[ -f "$status_file" ]]; then
  echo "Usuario: $bootstrap_username"
  echo "Contrasena temporal: $temporary_password"
  echo "Se solicitara cambiarla en el primer acceso."
  node -e "require('fs').rmSync('data/.admin-bootstrap-created', { force: true })"
else
  echo "Ya existia un administrador activo; conserva sus credenciales actuales."
fi
echo "Backup previo: $backup_dir"
