#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
E2E_DIR="$ROOT_DIR/e2e"
ENV_FILE="$E2E_DIR/.env"
COMPOSE_FILE="$E2E_DIR/docker-compose.yml"
LOG_DIR="$E2E_DIR/.runtime/logs"

SMOKE_WORKFLOW_ID="${SMOKE_WORKFLOW_ID:-graphor-e2e-smoke}"
AI_TOOL_WORKFLOW_ID="${AI_TOOL_WORKFLOW_ID:-graphor-gemini-agent-e2e-main-tool}"
RUN_AI_AGENT_E2E="${RUN_AI_AGENT_E2E:-1}"

. "$E2E_DIR/scripts/ensure-env.sh"
if [ "${E2E_ENV_CREATED:-0}" = "1" ]; then
  echo "Created $ENV_FILE. Fill GRAPHOR_API_KEY and prepare local n8n credentials before running this gate." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

mkdir -p "$LOG_DIR"

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

wait_for_n8n() {
  local port="${N8N_PORT:-5678}"
  for _ in $(seq 1 90); do
    if curl -fsS "http://localhost:${port}/healthz" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  echo "n8n did not become healthy on http://localhost:${port}/healthz" >&2
  return 1
}

start_n8n() {
  compose up -d
  wait_for_n8n
}

run_workflow() {
  local workflow_id="$1"
  local label="$2"
  local log_file="$LOG_DIR/${label}-$(date +%Y%m%d-%H%M%S).raw.log"

  echo "Running n8n workflow $workflow_id ($label)"
  compose run --rm --no-deps n8n execute --id "$workflow_id" --rawOutput >"$log_file" 2>&1
  echo "Wrote $log_file"
}

cd "$ROOT_DIR"

npm run lint
npm test -- --runInBand

bash "$E2E_DIR/scripts/install-local-node.sh"
start_n8n

compose exec -T n8n n8n import:workflow --input /workflows/graphor-full-smoke.workflow.json
compose exec -T n8n n8n import:workflow --input /workflows/graphor-gemini-agent-e2e-main-tool.workflow.json

compose exec -T n8n sh -lc 'node - <<'"'"'NODE'"'"'
const pkg = require("/home/node/.n8n/nodes/node_modules/n8n-nodes-graphorlm/package.json");
if (pkg.overrides) {
  throw new Error("package.json still contains overrides in the installed n8n package");
}
console.log(JSON.stringify({ name: pkg.name, version: pkg.version, hasOverrides: false }));
NODE'

cleanup() {
  start_n8n >/dev/null 2>&1 || true
}
trap cleanup EXIT

compose stop n8n >/dev/null
run_workflow "$SMOKE_WORKFLOW_ID" "graphor-full-smoke"

if [ "$RUN_AI_AGENT_E2E" = "1" ]; then
  run_workflow "$AI_TOOL_WORKFLOW_ID" "graphor-ai-agent-tool"
else
  echo "Skipping AI Agent E2E because RUN_AI_AGENT_E2E=$RUN_AI_AGENT_E2E"
fi

trap - EXIT
start_n8n

echo "Local n8n verification completed successfully."
