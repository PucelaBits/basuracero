#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ ! -f "$ROOT_DIR/.env" ]]; then
  echo "Error: falta .env. Copia .env.sample a .env y revisa BASE_URL y TRUST_PROXY antes de instalar." >&2
  exit 1
fi

if [[ -f "$ROOT_DIR/data/.installation-complete" ]]; then
  echo "Error: esta instancia ya esta instalada. Usa ./scripts/upgrade.sh para actualizarla." >&2
  exit 1
fi

exec "$ROOT_DIR/scripts/enable_admin.sh"
