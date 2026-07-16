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
      rm -f data/.admin-enabled 2>/dev/null || true
    fi
    docker compose up -d >/dev/null 2>&1 || true
  fi
}
trap restore_on_error EXIT

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: se necesita docker para activar el panel." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Error: se necesita Docker Compose v2 (docker compose)." >&2
  exit 1
fi

node_image="${ADMIN_ACTIVATION_NODE_IMAGE:-node:22-slim}"

docker_node() {
  docker run --rm \
    --user "$(id -u):$(id -g)" \
    --volume "$ROOT_DIR:/app" \
    --workdir /app \
    "$node_image" node "$@"
}

read_env_value() {
  docker_node -e '
    const fs = require("fs");
    const key = process.argv[1];
    const fallback = process.argv[2];
    const source = fs.existsSync(".env") ? fs.readFileSync(".env", "utf8") : "";
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = source.match(new RegExp(`^\\s*${escapedKey}\\s*=\\s*(.*)$`, "m"));
    let value = match ? match[1].trim() : fallback;
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("\u0027") && value.endsWith("\u0027"))) {
      value = value.slice(1, -1);
    }
    process.stdout.write(value || fallback);
  ' "$1" "$2"
}

docker_node_with_database_path() {
  local sqlite_db_path
  local docker_args
  sqlite_db_path="$(read_env_value SQLITE_DB_PATH '')"
  docker_args=(
    run --rm
    --user "$(id -u):$(id -g)"
    --volume "$ROOT_DIR:/app"
    --workdir /app
  )
  if [[ -n "$sqlite_db_path" ]]; then
    docker_args+=(--env "SQLITE_DB_PATH=$sqlite_db_path")
  fi
  docker_args+=("$node_image" node "$@")
  docker "${docker_args[@]}"
}

if ! docker image inspect "$node_image" >/dev/null 2>&1; then
  echo "Preparando el contenedor auxiliar de activacion..."
  docker pull "$node_image"
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

docker_node scripts/ensureAdminEnv.js
docker_node_with_database_path -e "require('./src/server/admin/activation').enableAdmin()"
base_url="$(read_env_value BASE_URL http://localhost:5050)"
bootstrap_username="$(read_env_value ADMIN_BOOTSTRAP_USERNAME admin)"

status_file="data/.admin-bootstrap-created"
rm -f "$status_file"
temporary_password="BCero-$(docker_node -e "process.stdout.write(require('crypto').randomBytes(12).toString('base64url'))")!"

echo "Construyendo la version actualizada..."
export APP_GIT_SHA="$(git rev-parse HEAD 2>/dev/null || true)"
docker compose build

echo "Aplicando migraciones y preparando el administrador inicial..."
export ADMIN_BOOTSTRAP_PASSWORD="$temporary_password"
export ADMIN_BOOTSTRAP_STATUS_FILE="/app/data/.admin-bootstrap-created"
docker compose run --rm \
  -e ADMIN_BOOTSTRAP_PASSWORD \
  -e ADMIN_BOOTSTRAP_STATUS_FILE \
  basuracero-app npm run admin:bootstrap
unset ADMIN_BOOTSTRAP_PASSWORD ADMIN_BOOTSTRAP_STATUS_FILE

docker_node scripts/clearAdminBootstrapEnv.js
docker compose up -d
if [[ ! -f data/update-channel ]]; then
  echo "stable" > data/update-channel
fi
chmod 600 data/update-channel 2>/dev/null || true
touch data/.installation-complete
chmod 600 data/.installation-complete 2>/dev/null || true
activation_completed=true

echo
echo "Panel administrativo activado."
echo "URL: ${base_url%/}/admin"
if [[ -f "$status_file" ]]; then
  echo "Usuario: $bootstrap_username"
  echo "Contrasena temporal: $temporary_password"
  echo "Se solicitara cambiarla en el primer acceso."
  rm -f "$status_file"
else
  echo "Ya existia un administrador activo; conserva sus credenciales actuales."
fi
echo "Backup previo: $backup_dir"
