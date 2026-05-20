#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
E2E_DIR="$ROOT_DIR/e2e"
ENV_FILE="$E2E_DIR/.env"

. "$E2E_DIR/scripts/ensure-env.sh"
if [ "${E2E_ENV_CREATED:-0}" = "1" ]; then
  echo "Created $ENV_FILE. Add GRAPHOR_API_KEY before running Graphor workflows."
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

mkdir -p "$E2E_DIR/.runtime/n8n" "$E2E_DIR/.runtime/packages" "$E2E_DIR/.runtime/logs"

docker compose --env-file "$ENV_FILE" -f "$E2E_DIR/docker-compose.yml" up -d

echo "n8n is starting at http://localhost:${N8N_PORT:-5678}"
echo "Follow logs with: docker compose --env-file e2e/.env -f e2e/docker-compose.yml logs -f n8n"
