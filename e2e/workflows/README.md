# Workflow Templates

Store safe-to-commit n8n workflow templates here.

Do not commit exported credentials or workflow files that contain secrets.

## First Smoke Workflow to Build

Create one workflow named `Graphor API Smoke` with these logical steps:

1. Manual Trigger.
2. Read Binary File from `/fixtures/invoice-smoke.txt`.
3. Graphor Source: Upload File with method `balanced`.
4. Poll Graphor Source: Get Build Status until `success` is true.
5. Set `file_id` from the build status response.
6. Graphor Source: Get Elements using `file_id`.
7. Graphor Chat: Ask `What is the invoice total and payment term?` using `file_ids`.
8. Graphor Extraction: Extract invoice fields using a small JSON Schema.
9. Graphor Retrieval: Retrieve Chunks with query `payment terms` using `file_ids`.
10. Graphor Source: Reprocess using `file_id` and method `fast`.
11. Poll the reprocess `build_id`.
12. Graphor Source: Delete using `file_id`.

After the workflow runs, export the workflow JSON and any non-secret execution evidence into `e2e/.runtime/`.
