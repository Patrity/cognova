# Cognova

Self-hosted, multi-tenant AI agent hub. Nuxt 4 + Nuxt UI v4 + AI SDK v6 + PostgreSQL (Drizzle ORM) + better-auth.

## Nuxt Knowledge Cutoff

Your Nuxt 4 and Nuxt UI v4 knowledge is outdated. Before writing frontend code:

```bash
# Nuxt composables/config
python3 .claude/skills/nuxt-docs/fetch.py <topic>

# UI components
python3 .claude/skills/nuxt-ui-docs/fetch.py <component>

# Layout patterns
python3 .claude/skills/nuxt-ui-templates/fetch.py <template> --structure
```

## Architecture Decisions

- **DB driver**: node-postgres (`pg`), NOT Neon — we run a persistent Node server
- **Auth**: better-auth with `getAuth()` lazy singleton (NOT module-level export) — runtime config must be available when called
- **DB access**: `getDb()` lazy singleton from `~~/server/db` — same pattern as auth
- **Agents**: GitHub repos or local directories, NOT npm packages. Install via `cognova agent add author/repo` (CLI) or GitHub URL (web UI)
- **No intent classifier**: users select agents manually, default agent pre-selected
- **Documents**: knowledge files at `~/knowledge/` with public sharing via `shared_documents` table
- **Interfaces**: `IKnowledgeLoader` (filesystem now, S3/DB later), `IMemoryManager` (PostgreSQL now, Mem0 later)
- **Chat transport**: SSE primary (AI SDK `streamText`), WebSocket optional for interrupts
- **Provider hierarchy**: Provider Type → Provider → Model (supports BYOK multi-tenant)
- **Encryption**: AES-256-GCM for secrets and provider API keys
- **Attachments**: base64 passthrough, no file storage in v1

## Rules

Auto-loaded from `.claude/rules/` based on file patterns:
- `nuxt4.md` - Vue/Nuxt files
- `nuxt-ui.md` - Vue components
- `backend.md` - Server TypeScript
- `database.md` - Drizzle schema/migrations
- `cli.md` - CLI development (deferred)

### Environment Variables

- Always use `useRuntimeConfig()` in server code, never direct `process.env` access
- Exception: `drizzle.config.ts` and other CLI tools that run outside Nuxt
- All env vars use `NUXT_` prefix for private or `NUXT_PUBLIC_` for client-exposed
- Validated at startup in `server/plugins/00.env-validate.ts`

### Styling

- Always use Nuxt UI components — avoid custom styling unless necessary
- Never use `dark:` or `light:` classes — Nuxt UI handles theming
- Never use specific color classes like `bg-red-500` — use semantic colors (`bg-error`, `bg-muted`) or Nuxt UI color props
- Theme configured in `app/app.config.ts` under the `ui` property

### Error Handling

- Server: `createError()` for HTTP errors, meaningful messages, never expose internals
- Client: `UToast` for all user-facing errors via `useToast()`
- Never silent-catch without logging

## Hooks

Enforcement via `.claude/hooks/`:
- **lint-check.sh** - Runs lint after edits

## Code Style

- No semicolons in TypeScript
- No brackets for single-line if/loops
- Types in `shared/types/`, never duplicate
- Ask questions rather than assume

## Workflow

1. Check [todo.md](./docs/todo.md) for current goals
2. Follow plans in `docs/todo/` folder
3. Update docs when deviating from plans

## Key File Locations

| Purpose | Path |
|---------|------|
| PRD | `docs/PRD.md` |
| Phase plans | `docs/todo/phase-{1-7}-*.md` |
| Progress tracker | `docs/todo.md` |
| Architecture reference | `Architecture.md` |
| DB schema | `server/db/schema/` |
| Shared types | `shared/types/index.ts` |
| Auth setup | `server/utils/auth.ts` |
| DB singleton | `server/db/index.ts` |
| Runtime config | `nuxt.config.ts` → `runtimeConfig` |
