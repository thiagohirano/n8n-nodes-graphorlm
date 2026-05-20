#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
E2E_DIR="$ROOT_DIR/e2e"
ENV_FILE="$E2E_DIR/.env"
LOG_DIR="$E2E_DIR/.runtime/logs"
STAMP="$(date +%Y%m%d-%H%M%S)"

. "$E2E_DIR/scripts/ensure-env.sh"

mkdir -p "$LOG_DIR"

docker compose --env-file "$ENV_FILE" -f "$E2E_DIR/docker-compose.yml" logs --no-color n8n > "$LOG_DIR/n8n-$STAMP.log"

if [ -f "$E2E_DIR/.runtime/n8n/database.sqlite" ]; then
  cp "$E2E_DIR/.runtime/n8n/database.sqlite" "$LOG_DIR/database-$STAMP.sqlite"
fi

echo "Captured logs in $LOG_DIR"
