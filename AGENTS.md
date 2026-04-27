# Graphor N8n - Agent Instructions

Default language: Brazilian Portuguese.

This repository is tracked by thi-config as alias `graphor-n8n`.
Cross-project metadata, paths, autonomy, and task files live in `thi-config/projects.conf`.
Autonomy: `dev`. Do not deploy remotely unless Thiago explicitly asks in the current thread.

## Project Context

Status: `novo`
Stack: TypeScript + n8n custom nodes

## Codex First Steps

1. Read this `AGENTS.md`.
2. Inspect `README.md`, `Makefile`, `package.json`, `pyproject.toml`, or equivalent project scripts before choosing commands.
3. Check `HUMAN_TASKS.md` for blockers that require Thiago.
4. Prefer existing project commands and conventions over new tooling.

## Working Rules

- Preserve user changes; do not reset, checkout, or overwrite files you did not edit.
- Use `codex exec` for non-interactive Codex work.
- Run real verification before reporting completion; if unavailable, say exactly what was not run.
- Add blockers that need Thiago to `HUMAN_TASKS.md` as one-line checklist items.
- Do not edit `thi-config/projects.conf` from this repository.
