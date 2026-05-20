#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
E2E_DIR="$ROOT_DIR/e2e"
ENV_FILE="$E2E_DIR/.env"

. "$E2E_DIR/scripts/ensure-env.sh"

docker compose --env-file "$ENV_FILE" -f "$E2E_DIR/docker-compose.yml" down

rm -rf "$E2E_DIR/.runtime"
mkdir -p "$E2E_DIR/.runtime/n8n" "$E2E_DIR/.runtime/packages" "$E2E_DIR/.runtime/logs"

echo "Reset e2e/.runtime. e2e/.env was preserved."
