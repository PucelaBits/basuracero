#!/usr/bin/env bash

# Se carga desde los asistentes de instalación y actualización. Mantiene los
# bind mounts con el mismo UID/GID que ejecuta Docker Compose en el host, sin
# exigir que el administrador configure nada manualmente.
ensure_docker_runtime_identity() {
  local host_uid host_gid
  host_uid="$(id -u)"
  host_gid="$(id -g)"

  if ! grep -q '^DOCKER_UID=' .env; then
    printf '\n# Identidad local generada automáticamente para los volúmenes Docker.\nDOCKER_UID=%s\n' "$host_uid" >> .env
  fi
  if ! grep -q '^DOCKER_GID=' .env; then
    printf 'DOCKER_GID=%s\n' "$host_gid" >> .env
  fi
}

repair_runtime_storage_ownership() {
  local host_uid host_gid
  host_uid="$(id -u)"
  host_gid="$(id -g)"

  docker compose run --rm --no-deps -T --user 0:0 basuracero-app sh -eu -c "
    mkdir -p /app/data /app/uploads
    chown -R ${host_uid}:${host_gid} /app/data /app/uploads
    find /app/data /app/uploads -type d -exec chmod 700 {} +
    find /app/data /app/uploads -type f -exec chmod 600 {} +
  "
}
