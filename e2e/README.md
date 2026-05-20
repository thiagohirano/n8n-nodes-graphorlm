# Graphor n8n E2E Lab

This folder is the local test lab for validating the Graphor n8n nodes inside a real n8n Docker instance.

The goal is to make it easy for a developer to:

1. Build the current node package from this repo.
2. Start a clean, current n8n instance with Docker.
3. Install the local `n8n-nodes-graphorlm` package into that instance.
4. Create or import workflows that exercise each Graphor node operation.
5. Capture n8n logs, execution records, workflow exports, and API evidence.

## Directory Model

Committed:

- `docker-compose.yml` starts n8n with a persistent local data folder.
- `.env.example` documents local environment variables without secrets.
- `scripts/` contains small helpers for setup, local package installation, log capture, and reset.
- `fixtures/` contains tiny test inputs that can be mounted into n8n workflows.
- `workflows/` stores workflow templates and notes that are safe to commit.

Ignored:

- `.env` contains local secrets, especially `GRAPHOR_API_KEY`.
- `.runtime/` contains n8n state, packaged `.tgz` files, logs, workflow exports, and other disposable artifacts.

## Quick Start

From the repo root:

```bash
cp e2e/.env.example e2e/.env
# Edit e2e/.env and set GRAPHOR_API_KEY.
bash e2e/scripts/start-n8n.sh
bash e2e/scripts/install-local-node.sh
```

Then open n8n at:

```text
http://localhost:5678
```

In n8n, create a Graphor credential using the same test key from `e2e/.env`, then build or import smoke workflows from `e2e/workflows/`.

## Release Gate

Before publishing or resubmitting this package for n8n Cloud verification, run:

```bash
npm run verify:n8n:local
```

This gate installs the current package tarball into the Docker n8n runtime, imports the versioned smoke workflows, verifies that the installed package has no `overrides`, and executes:

- `graphor-e2e-smoke` for the real Graphor node operations.
- `graphor-gemini-agent-e2e-main-tool` for the AI Agent path using the generated `n8n-nodes-graphorlm.graphorTool` node.

Set `RUN_AI_AGENT_E2E=0` only when the local n8n runtime does not have AI model credentials and you are not changing tool behavior.

## Test Strategy

The fastest high-confidence loop is:

1. **Unit checks in repo**
   - `npm test -- --runInBand`
   - `npm run build`
   - `npm run lint`
2. **Install current repo package into n8n**
   - `bash e2e/scripts/install-local-node.sh`
   - This builds, packs, installs into `/home/node/.n8n/nodes`, and restarts n8n.
3. **Manual or assisted workflow smoke**
   - Upload or ingest a fixture.
   - Poll build status until `success` is true.
   - Use the returned `file_id` for list, get elements, chat, extraction, retrieval, reprocess, and delete.
4. **Capture evidence**
   - `bash e2e/scripts/capture-logs.sh`
   - Export workflows and execution evidence into `e2e/.runtime/`.

## Node Coverage Checklist

Use `file_id` wherever possible. `file_names` is deprecated in Graphor's current docs.

- Source: upload file -> returns `build_id`.
- Source: upload URL -> returns `build_id`.
- Source: upload GitHub -> returns `build_id`.
- Source: upload YouTube -> returns `build_id`.
- Source: get build status -> returns `file_id` when `success` is true.
- Source: list -> optional filter by `file_ids`.
- Source: get elements -> `GET /get-elements` with `file_id`.
- Source: reprocess -> returns new `build_id` for same `file_id`.
- Source: delete -> removes the source by `file_id`.
- Chat: ask -> `POST /ask-sources`.
- Chat: ask with `output_schema` -> validates structured output path.
- Extraction: extract -> `POST /run-extraction`.
- Retrieval: retrieve chunks -> `POST /prebuilt-rag`.
- AI Tool: generated Graphor tool wrapper from `usableAsTool: true` on the main Graphor node.

## Current Graphor API Assumptions

- Base URL: `https://sources.graphorlm.com`
- Auth header: `Authorization: Bearer <GRAPHOR_API_KEY>`
- Ingestion and reprocess are async and return `build_id`.
- `GET /builds/{build_id}` must be polled until `success` is true before using `file_id`.
- Parsing methods are `fast`, `balanced`, `accurate`, and `agentic`.
- Chat and extraction support `thinking_level`: `fast`, `balanced`, `accurate`.

## Log and Data Capture

Use:

```bash
bash e2e/scripts/capture-logs.sh
```

This writes Docker logs to `e2e/.runtime/logs/`. If the n8n SQLite database exists, the script also snapshots it for post-run inspection.

Do not commit anything from `.runtime/`.

## Resetting the Lab

To stop n8n but keep data:

```bash
docker compose --env-file e2e/.env -f e2e/docker-compose.yml down
```

To wipe the local n8n state and start over:

```bash
bash e2e/scripts/reset-runtime.sh
```
