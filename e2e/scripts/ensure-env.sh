#!/usr/bin/env bash
set -euo pipefail

E2E_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$E2E_DIR/.env"
E2E_ENV_CREATED=0

generate_key() {
  if command -v node >/dev/null 2>&1; then
    node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))"
  elif command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    printf 'local-%s-%s' "$(date +%s)" "$RANDOM"
  fi
}

if [ ! -f "$ENV_FILE" ]; then
  cp "$E2E_DIR/.env.example" "$ENV_FILE"
  E2E_ENV_CREATED=1
fi

if ! grep -q '^N8N_ENCRYPTION_KEY=.' "$ENV_FILE"; then
  generated_key="$(generate_key)"
  if grep -q '^N8N_ENCRYPTION_KEY=' "$ENV_FILE"; then
    tmp_file="$(mktemp)"
    sed "s/^N8N_ENCRYPTION_KEY=.*/N8N_ENCRYPTION_KEY=$generated_key/" "$ENV_FILE" >"$tmp_file"
    mv "$tmp_file" "$ENV_FILE"
  else
    printf '\nN8N_ENCRYPTION_KEY=%s\n' "$generated_key" >>"$ENV_FILE"
  fi
fi
