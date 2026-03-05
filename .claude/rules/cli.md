---
paths: "cli/**/*.ts"
---

# CLI Development Rules (Deferred)

The CLI is planned but deferred until the web app is stable. When implemented, it will live in `cli/` as a workspace package.

## Planned Commands

- `cognova agent add author/repo` — Install agent from GitHub
- `cognova agent remove <name>` — Uninstall agent
- `cognova agent list` — List installed agents
- `cognova init` — Initialize Cognova installation
- `cognova start` / `stop` / `restart` — Process management

## Key Conventions

- CLI types are CLI-internal, NOT shared with the Nuxt app
- The Nuxt app's shared types live in `shared/types/index.ts`
- Agent install = clone GitHub repo + register in `installed_agents` table
