# Phase 1: Foundation & Infrastructure

**Goal:** App boots, users can register/login, database is live, app shell is navigable.

**Status:** Not started

---

## Tasks

### 1.1 PostgreSQL + Docker Compose
- [ ] Create `docker-compose.yml` with PostgreSQL 16-alpine
- [ ] Named volume `cognova-pgdata`
- [ ] Health check with `pg_isready`
- [ ] Port 5432 exposed
- [ ] Add `db:up` / `db:down` scripts to package.json

### 1.2 Install Dependencies
- [ ] `pnpm add @nuxt/ui @nuxt/eslint drizzle-orm pg better-auth`
- [ ] `pnpm add -D drizzle-kit @types/pg`
- [ ] Configure nuxt.config.ts: add modules, set `node-server` preset
- [ ] Configure ESLint (stylistic, no semicolons)

### 1.3 Drizzle ORM Setup
- [ ] Create `drizzle.config.ts`
- [ ] Create `server/db/index.ts` — connection singleton using node-postgres
- [ ] Create `server/db/schema/index.ts` — re-exports all schema files
- [ ] Add migration scripts to package.json: `db:generate`, `db:migrate`, `db:push`, `db:studio`

### 1.4 Database Schema
- [ ] `server/db/schema/auth.ts` — better-auth tables (user, session, account, verification)
- [ ] `server/db/schema/providers.ts` — provider_types, providers, models
- [ ] `server/db/schema/agents.ts` — installed_agents, agent_configs
- [ ] `server/db/schema/conversations.ts` — conversations, messages
- [ ] `server/db/schema/tasks.ts` — projects, tasks
- [ ] `server/db/schema/memory.ts` — memory_chunks
- [ ] `server/db/schema/cron.ts` — cron_agents, cron_agent_runs
- [ ] `server/db/schema/documents.ts` — shared_documents (knowledge file sharing)
- [ ] `server/db/schema/system.ts` — secrets, token_usage, app_settings
- [ ] Generate initial migration
- [ ] Verify all user-scoped tables have userId FK

### 1.5 Shared Types
- [ ] Create `shared/types/index.ts`
- [ ] Export inferred types from all Drizzle schemas (InferSelectModel, InferInsertModel)
- [ ] Define enums: TaskStatus, MessageRole, MemoryChunkType, CronRunStatus, ProviderTypeId
- [ ] API response wrapper type

### 1.6 better-auth Setup
- [ ] Create `server/utils/auth.ts` — better-auth instance
- [ ] Email/password provider
- [ ] Admin role support
- [ ] API key plugin
- [ ] Session config (7-day expiry, 24-hour refresh)
- [ ] Create `server/middleware/auth.ts` — protect routes
- [ ] Define public paths (/api/auth/*, /api/health, /login, /register, /view/*)
- [ ] Create `app/plugins/auth.client.ts` — client-side auth plugin
- [ ] Create `app/composables/useAuth.ts`

### 1.7 Environment & Config
- [ ] Create `.env.example` with all required variables
- [ ] Configure `nuxt.config.ts` runtime config (public + private)
- [ ] Create `server/plugins/00.env-validate.ts` — validate required env vars on startup
- [ ] Create `server/plugins/01.database.ts` — initialize DB connection
- [ ] Create `server/plugins/02.admin-seed.ts` — create admin user from env if not exists

### 1.8 App Shell
- [ ] Create `app/layouts/default.vue` — sidebar layout
- [ ] Sidebar navigation: Dashboard, Chat, Agents, Tasks, Knowledge, Memories, Settings
- [ ] Collapsible sidebar (icon-only mode)
- [ ] User menu in sidebar footer (avatar, name, logout)
- [ ] Color mode toggle
- [ ] Mobile responsive (hamburger menu)
- [ ] Create `app/layouts/auth.vue` — centered card layout for login/register
- [ ] Create `app/layouts/public.vue` — minimal layout for public pages

### 1.9 Auth Pages
- [ ] Create `app/pages/login.vue` — email/password form
- [ ] Create `app/pages/register.vue` — registration form
- [ ] Create `app/middleware/auth.ts` — client-side auth guard
- [ ] Redirect to /login if unauthenticated
- [ ] Redirect to /dashboard if already authenticated (on login/register pages)

### 1.10 Dashboard Page
- [ ] Create `app/pages/dashboard.vue` — placeholder cards
- [ ] Cards: Recent Conversations, Tasks Summary, Token Usage, Active Agents
- [ ] Skeleton loading states
- [ ] Empty states with helpful messages

### 1.11 Health Check
- [ ] Create `server/api/health.get.ts` — DB connection check, app version

---

## Acceptance Criteria

1. `docker compose up -d` starts PostgreSQL
2. `pnpm dev` boots Nuxt with no errors
3. All DB tables created via migration
4. User can register at /register
5. User can login at /login
6. Authenticated user sees sidebar layout with navigation
7. Unauthenticated user is redirected to /login
8. Dashboard shows placeholder cards
9. Color mode toggle works
10. Admin user auto-created from env vars on first boot
