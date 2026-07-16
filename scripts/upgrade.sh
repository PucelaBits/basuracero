#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

remote="${UPGRADE_REMOTE:-origin}"
branch="${UPGRADE_BRANCH:-main}"
upgrade_completed=false
service_stopped=false

restart_on_error() {
  exit_code=$?
  if [[ $exit_code -ne 0 && "$service_stopped" == true && "$upgrade_completed" != true ]]; then
    echo "La actualizacion no se completo; intentando mantener el servicio disponible..." >&2
    docker compose up -d >/dev/null 2>&1 || true
  fi
}
trap restart_on_error EXIT

if [[ ! -f .env || ! -f data/incidencias.sqlite ]]; then
  echo "Error: no se ha detectado una instalacion completa. Ejecuta primero ./scripts/install.sh." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  echo "Error: se necesita Docker y Docker Compose v2 para actualizar." >&2
  exit 1
fi

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "Error: hay cambios locales en archivos versionados. Guardalos o reviertelos antes de actualizar." >&2
  exit 1
fi

current_branch="$(git branch --show-current)"
if [[ "$current_branch" != "$branch" ]]; then
  echo "Error: la rama actual es '$current_branch'; se esperaba '$branch'." >&2
  echo "Si tu despliegue usa otra rama, ejecuta UPGRADE_BRANCH=$current_branch ./scripts/upgrade.sh" >&2
  exit 1
fi

channel="stable"
if [[ -f data/update-channel ]]; then
  channel="$(tr -d '[:space:]' < data/update-channel)"
fi
if [[ "$channel" != "stable" && "$channel" != "beta" ]]; then
  echo "Error: el canal de actualizaciones guardado no es valido: '$channel'." >&2
  exit 1
fi

echo "Buscando actualizaciones del canal $channel en $remote/$branch..."
git fetch --prune --prune-tags --tags "$remote" "$branch"

current_revision="$(git rev-parse HEAD)"
target_label="$remote/$branch"
if [[ "$channel" == "stable" ]]; then
  stable_tag=""
  while IFS= read -r candidate; do
    if [[ "$candidate" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] && git merge-base --is-ancestor "$candidate" "$remote/$branch"; then
      stable_tag="$candidate"
      break
    fi
  done < <(git tag --list 'v*' --sort=-v:refname)
  if [[ -z "$stable_tag" ]]; then
    echo "Error: no se ha encontrado ninguna version estable etiquetada como vMAJOR.MINOR.PATCH." >&2
    exit 1
  fi
  latest_revision="$(git rev-list -n 1 "$stable_tag")"
  target_label="$stable_tag"
else
  latest_revision="$(git rev-parse "$remote/$branch")"
fi
retry_marker="data/.upgrade-incomplete"
if [[ "$current_revision" == "$latest_revision" && ! -f "$retry_marker" ]]; then
  echo "La instalacion ya esta actualizada en el canal $channel (${current_revision:0:7})."
  exit 0
fi

if [[ "$current_revision" != "$latest_revision" ]] && ! git merge-base --is-ancestor "$current_revision" "$latest_revision"; then
  echo "Error: la copia local y $target_label han divergido; no se puede hacer una actualizacion segura automatica." >&2
  exit 1
fi

echo "Deteniendo el servicio y creando una copia de seguridad..."
docker compose stop basuracero-app
service_stopped=true
touch "$retry_marker"

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="backups/upgrade-$timestamp"
mkdir -p "$backup_dir"
cp data/incidencias.sqlite "$backup_dir/incidencias.sqlite"
if [[ -d uploads ]]; then
  cp -R uploads "$backup_dir/uploads"
fi
cp .env "$backup_dir/env.backup"

if [[ "$current_revision" != "$latest_revision" ]]; then
  git merge --ff-only "$target_label"
else
  echo "Reintentando el despliegue de la revision ${current_revision:0:7}..."
fi
deployed_revision="$(git rev-parse HEAD)"
export APP_GIT_SHA="$deployed_revision"

echo "Construyendo y arrancando la nueva version (${deployed_revision:0:7})..."
docker compose build basuracero-app
docker compose up -d basuracero-app

container_id="$(docker compose ps -q basuracero-app)"
health_status="starting"
for _attempt in {1..45}; do
  health_status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null || true)"
  if [[ "$health_status" == "healthy" || "$health_status" == "running" ]]; then
    upgrade_completed=true
    service_stopped=false
    rm -f "$retry_marker"
    echo "Actualizacion completada: ${current_revision:0:7} -> ${deployed_revision:0:7}"
    echo "Backup previo: $backup_dir"
    exit 0
  fi
  if [[ "$health_status" == "unhealthy" || "$health_status" == "exited" || "$health_status" == "dead" ]]; then
    break
  fi
  sleep 2
done

echo "Error: el servicio no ha quedado saludable (estado: ${health_status:-desconocido})." >&2
echo "Backup disponible en: $backup_dir" >&2
docker compose logs --tail=80 basuracero-app >&2 || true
exit 1
