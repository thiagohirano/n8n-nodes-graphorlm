#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
E2E_DIR="$ROOT_DIR/e2e"
ENV_FILE="$E2E_DIR/.env"
PACKAGE_DIR="$E2E_DIR/.runtime/packages"

. "$E2E_DIR/scripts/ensure-env.sh"
if [ "${E2E_ENV_CREATED:-0}" = "1" ]; then
  echo "Created $ENV_FILE. Add GRAPHOR_API_KEY before running Graphor workflows."
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

mkdir -p "$PACKAGE_DIR" "$E2E_DIR/.runtime/logs"

cd "$ROOT_DIR"
npm run build
rm -f "$PACKAGE_DIR"/n8n-nodes-graphorlm-*.tgz
npm pack --pack-destination "$PACKAGE_DIR"

TARBALL="$(find "$PACKAGE_DIR" -maxdepth 1 -name 'n8n-nodes-graphorlm-*.tgz' -print | sort | tail -n 1)"
if [ -z "$TARBALL" ]; then
  echo "Could not find packed n8n-nodes-graphorlm tarball in $PACKAGE_DIR" >&2
  exit 1
fi

docker compose --env-file "$ENV_FILE" -f "$E2E_DIR/docker-compose.yml" up -d

TARBALL_NAME="$(basename "$TARBALL")"
docker compose --env-file "$ENV_FILE" -f "$E2E_DIR/docker-compose.yml" exec -T n8n sh -lc \
  "mkdir -p /home/node/.n8n/nodes && cd /home/node/.n8n/nodes && npm install /packages/$TARBALL_NAME --omit=dev --legacy-peer-deps"

docker compose --env-file "$ENV_FILE" -f "$E2E_DIR/docker-compose.yml" restart n8n

echo "Installed $TARBALL_NAME into the local n8n runtime and restarted n8n."
