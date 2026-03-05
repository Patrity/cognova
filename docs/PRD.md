# Cognova — Product Requirements Document

> Self-hosted, multi-tenant AI agent hub. Users install domain-specific agents,
> configure them via generated UI forms, and chat with them. Agents are modular
> packages (GitHub repos or local directories) — they ship with their own tools,
> knowledge files, and a config schema. The framework handles auth, model routing,
> knowledge loading, streaming, and MCP exposure.

---

## Decisions Register

All decisions confirmed during planning. Do not revisit without explicit discussion.

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Nuxt 4, `node-server` preset only | Filesystem access, long-running connections, chokidar |
| UI library | Nuxt UI v4 | Already scaffolded, component-rich |
| AI execution | AI SDK v6 (`streamText`, `generateText`, tool loop) | Replaces Claude Code CLI subprocess model |
| Database | PostgreSQL via Drizzle ORM | Relational, mature, self-hosted |
| DB driver | node-postgres (`pg`) via `drizzle-orm/node-postgres` | Standard driver for persistent Node server — no Neon |
| Auth | better-auth, multi-user, admin + user roles, API key plugin | Proven in second-brain |
| Package manager | pnpm | Project standard |
| Chat transport | SSE primary (AI SDK v6 streamText), WebSocket for bidirectional features | SSE for simplicity, WS for interrupts/status |
| Knowledge storage | `~/knowledge/` on host filesystem, hot-watched with chokidar | Architecture.md decision |
| Agent format | GitHub repos or local directories (createAgent contract) | Simpler than npm — `cognova agent add author/repo` via CLI, or GitHub URL in web UI |
| Agent config storage | PostgreSQL — rendered as generated form from JSON Schema (flat schemas only) | Per-user config support |
| Agent distribution | GitHub-based — no npm publish required for agent devs | CLI: `cognova agent add author/repo`. Web: paste GitHub URL or local path |
| Memory system | Custom DB-backed chunks, Mem0-ready interface | Custom now, swap later |
| Settings scope | Full (app, account, providers, secrets) | Essential for self-hosted |
| CLI | Deferred to post-web-app phase (includes `cognova agent add`) | Focus on core app first |
| Attachments | Base64 passthrough, no file storage | Keep simple for v1 |
| Error UX | UToast (Nuxt UI) for all user-facing errors | Consistent, non-intrusive |
| Testing | Manual user testing with checkpoints per phase | No automated test suite in v1 |
| Language | TypeScript throughout | No exceptions |

---

## Architecture Overview

### AI Provider Hierarchy

```
Provider Type     the AI SDK package that handles this class of provider
  └── Provider    a user-configured instance (baseURL, API key, name)
        └── Model a specific model ID available on that provider instance
```

### Provider Types (shipped with Cognova)

| Type ID | AI SDK Package | Examples |
|---|---|---|
| `openai-compatible` | `@ai-sdk/openai-compatible` | vLLM, LiteLLM, Ollama |
| `anthropic` | `@ai-sdk/anthropic` | Anthropic API |
| `openai` | `@ai-sdk/openai` | OpenAI API |
| `claude-code` | community adapter | Claude Code CLI |

### DB Schema (all tables)

```
Auth (better-auth managed):
  user, session, account, verification

Provider stack:
  provider_types → providers → models

Agent stack:
  installed_agents, agent_configs

Chat:
  conversations → messages

Tasks:
  projects → tasks

Memory:
  memory_chunks

Scheduling:
  cron_agents → cron_agent_runs

Knowledge sharing:
  shared_documents (references knowledge file paths)

System:
  secrets, token_usage, app_settings
```

### Agent Package Contract

Agents are GitHub repos or local directories. No npm publish required.
Installed via `cognova agent add author/repo` (CLI) or GitHub URL / local path (web UI).

```
cognova-agent-[name]/          <- GitHub repo or local directory
  manifest.yaml                <- identity, keywords, model preference
  index.ts                     <- exports createAgent(config, context): CognovaAgent
  config.schema.json           <- optional JSON Schema (flat only), drives settings form
  tools/                       <- AI SDK v6 tool() definitions
  knowledge/                   <- default knowledge files, copied to ~/knowledge/[id]/ on install
  README.md
```

### getModel() Contract

Takes a model DB record (or tag query), walks up to provider and provider type,
instantiates the correct AI SDK client, returns a `LanguageModel`. Agents never
call this directly.

### Knowledge Architecture

```
~/knowledge/
├── _system/              <- reserved
└── [agent-id]/
    ├── schema.json
    ├── relationships.yaml
    ├── glossary.yaml
    ├── formulas.yaml
    └── *.yaml / *.json
```

Hot-watched with chokidar. On change, invalidate affected agent's cache.
Next request re-loads from disk. No restart required.

Accessed through an `IKnowledgeLoader` interface so the backing store (filesystem
today, S3/DB for cloud later) can be swapped without touching agent code.

---

## Phased Build Plan

Each phase's output is the foundation for the next. Phases are sequential
but tasks within a phase can be parallelized.

---

### Phase 1: Foundation & Infrastructure

**Goal:** App boots, users can register/login, database is live, app shell is navigable.

**Deliverables:**

1. **PostgreSQL + Docker Compose**
   - docker-compose.yml with PostgreSQL 16
   - Named volume for persistence
   - Health check with pg_isready

2. **Drizzle ORM Setup**
   - `drizzle-orm` + `pg` (node-postgres driver)
   - `drizzle.config.ts` pointing to `server/db/`
   - Connection singleton in `server/db/index.ts`
   - Schema directory structure: `server/db/schema/`
   - Migration workflow scripts in package.json

3. **Full DB Schema (all tables)**
   - Auth tables (better-auth managed): user, session, account, verification
   - `provider_types` — id, name, aiSdkPackage, configSchema (jsonb)
   - `providers` — id, typeId (FK), userId (FK), name, configJson (encrypted jsonb)
   - `models` — id, providerId (FK), modelId (text), displayName, tags (text[])
   - `installed_agents` — id, repoUrl (text, nullable), localPath (text, nullable), manifestJson (jsonb), configSchemaJson (jsonb), enabled, builtIn, installedAt
   - `agent_configs` — id, agentId (FK), userId (FK, nullable for global), configJson (jsonb), unique(agentId, userId)
   - `conversations` — id, userId (FK), agentId (FK, nullable), title, createdAt, updatedAt
   - `messages` — id, conversationId (FK), role (user|assistant|system|tool), content (jsonb), toolCallsJson (jsonb), createdAt
   - `projects` — id, userId (FK), name, description, status, deletedAt (soft delete)
   - `tasks` — id, projectId (FK, nullable), userId (FK), title, description, status (todo|in_progress|done|blocked), priority (1-3), tags (text[]), dueDate, completedAt, createdAt, updatedAt
   - `memory_chunks` — id, userId (FK), agentId (FK, nullable), type (decision|fact|solution|pattern|preference|summary), content (text), metadata (jsonb), createdAt, updatedAt
   - `cron_agents` — id, userId (FK), agentId (FK), name, schedule (cron expression), prompt, enabled, maxTurns, maxBudget, createdAt
   - `cron_agent_runs` — id, cronAgentId (FK), status (running|success|error|budget_exceeded|cancelled), result (text), tokensUsed, cost, startedAt, completedAt
   - `shared_documents` — id, userId (FK), filePath (text, relative to knowledge root), title (text), isPublic, publicSlug (text, unique), createdAt, updatedAt
   - `secrets` — id, userId (FK), key (text), encryptedValue (text), iv (text), createdAt, updatedAt, unique(userId, key)
   - `token_usage` — id, userId (FK), providerId (FK), modelId (text), source (chat|agent|memory|cron), inputTokens, outputTokens, cost, createdAt
   - `app_settings` — id, key (text, unique), value (jsonb), updatedAt

   **Critical**: Every user-scoped record has a userId FK. Multi-tenant from day one.

4. **better-auth Setup**
   - Email/password authentication
   - Admin + user roles
   - API key plugin (for future CLI and external access)
   - Session management (7-day expiry, 24-hour refresh)
   - Auth middleware for server routes
   - Public paths: `/api/auth/*`, `/api/health`, `/login`, `/register`

5. **App Shell**
   - Sidebar layout (collapsible) with navigation
   - Navigation items: Dashboard, Chat, Agents, Tasks, Knowledge, Memories, Settings
   - Color mode toggle (dark/light via Nuxt UI)
   - User menu (profile, logout)
   - Responsive (sidebar collapses to hamburger on mobile)
   - Login page, register page
   - Auth middleware (redirect to /login if unauthenticated)
   - Dashboard page (skeleton/placeholder cards)

6. **Shared Types**
   - `shared/types/index.ts` with inferred Drizzle types
   - API response types
   - All enums as const objects

7. **Environment & Config**
   - `.env.example` with all required vars
   - `nuxt.config.ts`: node-server preset, runtime config, modules
   - Env validation in Nitro plugin on startup

**Dependencies:** None (this is the base)

**Testing checkpoint:** Docker starts, app boots, register/login works, sidebar navigates, dashboard renders, admin auto-created from env.

**Reference from second-brain:**
- better-auth setup (`server/utils/auth.ts`)
- Drizzle config pattern
- Docker compose
- Auth middleware pattern
- App shell layout

---

### Phase 2: Settings & Provider Management

**Goal:** Users can configure AI providers, manage models, and store secrets. The `getModel()` function resolves any model reference to an AI SDK LanguageModel.

**Deliverables:**

1. **Settings Layout**
   - `/settings` page with tab/sub-page navigation
   - Sub-pages: General, Account, Providers, Secrets
   - Admin-only sections clearly gated

2. **App Settings Page** (`/settings/general`)
   - App name, default model selection
   - Knowledge directory path display
   - Stored in `app_settings` table

3. **Account Settings Page** (`/settings/account`)
   - Profile: name, email
   - Password change
   - API key generation/revocation (better-auth API key plugin)

4. **Provider Management** (`/settings/providers`)
   - Seed `provider_types` table on first boot (openai-compatible, anthropic, openai, claude-code)
   - Each type has a `configSchema` (JSON Schema) that drives the add-provider form
   - Add provider: select type → generated form (baseURL, apiKey, name)
   - Edit/delete provider
   - List models per provider: manual add or auto-discover (where supported)
   - Model tags (text array): `local`, `frontier`, `fast`, `coding`, etc.
   - Test connection button (validate API key / endpoint)

5. **Secrets Management** (`/settings/secrets`)
   - Encrypted key-value store (AES-256-GCM)
   - CRUD UI for secrets
   - Used by agent configs for sensitive values
   - API endpoints for agents to read secrets at runtime

6. **getModel() Implementation**
   - `server/ai/get-model.ts`
   - Input: model DB record OR tag-based query (e.g. `{ tags: ['local', 'coding'] }`)
   - Resolution: model → provider → provider_type → dynamic import AI SDK package
   - Instantiate provider client with decrypted config
   - Return `LanguageModel` instance
   - Fallback logic: if preferred tags yield no result, fall back by removing tags in priority order
   - Cache provider client instances (don't re-instantiate per request)

7. **Token Usage Tracking**
   - `server/ai/cost.ts` — per-provider pricing data
   - `logTokenUsage()` utility — writes to `token_usage` table
   - Usage API endpoints for dashboard/settings display

**Dependencies:** Phase 1

**Testing checkpoint:** Add a provider (e.g. Anthropic), add a model, verify getModel() returns a LanguageModel, store/retrieve a secret, view usage data.

**Reference from second-brain:**
- Provider management (`server/api/providers/`, `server/ai/`)
- Secrets management (`server/api/secrets/`)
- Settings pages (`app/pages/settings/`)
- Cost tracking (`server/ai/cost.ts`)

---

### Phase 3: Agent Runtime & Chat

**Goal:** End-to-end streaming chat works. User sends a message, the system routes it to an agent, the agent processes it with AI SDK v6, and the response streams back.

**Deliverables:**

1. **Agent Type System**
   - `shared/types/agent.ts`:
     - `CognovaAgent` — the object returned by `createAgent()`
     - `AgentManifest` — parsed from manifest.yaml
     - `AgentContext` — passed to `createAgent()` (getConfig, knowledge, getModel, memory, tools)
     - `AgentConfig` — user config values
   - Manifest YAML parser (js-yaml)

2. **Agent Loader**
   - `server/agents/loader.ts`
   - Load agent from `installed_agents` DB record
   - Resolve local path (cloned repo or local directory)
   - Call `createAgent(config, context)` with assembled context
   - Cache loaded agents (invalidate on config change or knowledge change)
   - Built-in agent special case (general agent loaded from local code)

3. **Knowledge Loader (IKnowledgeLoader interface)**
   - `server/knowledge/types.ts` — `IKnowledgeLoader` interface:
     - `load(agentId): Promise<AgentKnowledge>`
     - `invalidate(agentId): void`
     - `watch(): void` / `stop(): void`
   - `server/knowledge/fs-loader.ts` — filesystem implementation:
     - Read `~/knowledge/[agent-id]/` directory
     - Parse YAML, JSON, Markdown files into structured objects
     - chokidar watcher on `~/knowledge/`
     - On file change: identify affected agent, invalidate its cache
   - Nitro plugin to start watcher on boot
   - Interface allows future swap to S3/DB-backed loader for cloud

4. **Default Agent (built-in)**
   - Ships with Cognova, always installed, cannot be uninstalled
   - General-purpose assistant — serves as the default chatbot
   - Also serves as the reference implementation for agent authors
   - No specialized tools initially (tools added in Phase 5)
   - `builtIn: true` in `installed_agents`
   - Users select agents manually via agent selector (no auto-classification)

6. **Chat API Endpoint (SSE)**
   - `server/api/chat.post.ts`
   - Accepts: `{ conversationId?, agentId?, message, attachments? }`
   - Attachments: base64 passthrough to model (no file storage in v1)
   - Creates/resumes conversation in DB
   - Resolves agent: uses agentId if provided, falls back to default agent
   - Calls `getModel()` for the agent's preferred model
   - Executes AI SDK v6 `streamText()` with agent's system prompt, tools, and knowledge
   - Returns SSE stream (text/event-stream)
   - Persists assistant message + tool calls to DB on completion
   - Logs token usage

7. **WebSocket Endpoint (optional bidirectional)**
   - `server/routes/_ws/chat.ts`
   - Supports `chat:interrupt` to cancel in-progress streams
   - Supports `chat:typing` indicators
   - Falls back gracefully if client uses SSE instead

8. **Chat UI** (`/chat`, `/chat/[id]`)
   - Conversation sidebar (list, search, new, delete)
   - Message list with streaming rendering
   - User message input (text, paste images)
   - Agent selector dropdown (select agent manually, default agent pre-selected)
   - Tool call visualization (collapsible blocks showing tool name, input, output)
   - Markdown rendering for assistant messages
   - Loading/streaming indicators
   - Error handling and retry

9. **Conversation Persistence**
   - Auto-create conversation on first message
   - Auto-title from first message (or LLM-generated title)
   - Message history stored in DB (content as jsonb)
   - Load history on conversation open

**Dependencies:** Phase 1, Phase 2

**Testing checkpoint:** Send a message, response streams back, tool calls render, conversation persists across reload, multiple conversations work, agent selector changes agent, stream can be interrupted.

**Reference from second-brain:**
- Chat WebSocket (`server/routes/_ws/chat.ts`)
- Chat UI (`app/pages/chat.vue`, `app/pages/chat/[[id]].vue`)
- Streaming message component
- Tool call visualization
- Chat composable (`app/composables/useChat.ts`)
- Chat session manager

---

### Phase 4: Agent Management & Knowledge Editor

**Goal:** Users can install agents, configure them via generated forms, and edit knowledge files in-browser.

**Deliverables:**

1. **Agent Installer**
   - `server/agents/installer.ts`
   - Install from GitHub: clone `author/repo` into local agents directory
   - Install from local path: symlink or register path
   - On install: parse manifest.yaml, extract config.schema.json, copy default knowledge files to `~/knowledge/[agent-id]/`
   - Run `pnpm install` inside agent directory if it has dependencies
   - Write `installed_agents` record (repoUrl or localPath)
   - Uninstall: remove cloned directory, remove DB record, optionally clean knowledge files
   - Update: `git pull` in cloned repo directory

2. **Agents Page** (`/agents`)
   - List installed agents (card grid)
   - Each card: name, description, version, enabled/disabled toggle, configure button
   - Install button → modal: enter GitHub repo URL (`author/repo`) or local path
   - Uninstall with confirmation

3. **Agent Config Form** (`/agents/[id]/config`)
   - Generated from `config.schema.json` (JSON Schema draft-07)
   - Field types mapped to Nuxt UI form components:
     - string → UInput
     - string + format:password → UInput type=password (stored encrypted)
     - number → UInputNumber
     - boolean → UToggle
     - enum → USelect
     - array → repeatable field group
   - `x-cognova-group` for field grouping
   - Save stores to `agent_configs` (per-user or global)
   - Validation against JSON Schema before save

4. **Knowledge Editor** (`/knowledge`)
   - File browser: tree view of `~/knowledge/`
   - Per-agent subdirectories
   - File types:
     - Markdown: rich editor (TipTap/prose via Nuxt UI)
     - YAML/JSON: monospace code editor (CodeMirror or Monaco)
   - Save triggers chokidar watcher (no manual reload needed)
   - Create new file, rename, delete
   - Large file handling (streaming read for files > 1MB)

5. **Agent Selector Enhancement**
   - Chat agent selector now populated from installed agents (enabled only)
   - Shows agent icon/avatar, name, description
   - Default agent pre-selected (no auto-classification)

**Dependencies:** Phase 3

**Testing checkpoint:** Install agent from GitHub URL, install from local path, config form generates correctly, save/load config, edit a knowledge file and verify next chat reflects changes, enable/disable agent.

**Reference from second-brain:**
- Skills management UI (`app/pages/skills/`)
- Vault/file browser component
- TipTap editor integration

---

### Phase 5: Tasks, Memory & Documents

**Goal:** Agents can create/manage tasks, remember context across sessions, and users can share documents publicly.

**Deliverables:**

1. **Task System**
   - API: CRUD for tasks and projects (`server/api/tasks/`, `server/api/projects/`)
   - Task properties: title, description, status, priority, tags, dueDate, projectId
   - Project properties: name, description, status (soft delete)
   - Tasks page (`/tasks`): list with filters (status, priority, project, tags), inline edit
   - Task detail modal/panel
   - Project sidebar or tabs for organization

2. **Memory System**
   - `server/memory/manager.ts` — MemoryManager class with interface designed for Mem0 swap
   - Interface: `store(chunk)`, `search(query, filters)`, `getContext(agentId, userId)`, `forget(id)`
   - Chunk types: decision, fact, solution, pattern, preference, summary
   - Storage: `memory_chunks` table (custom implementation)
   - Search: full-text search on content field (pg tsvector or ILIKE for MVP)
   - `getContext()`: retrieves relevant memories for an agent's system prompt
   - Memory page (`/memories`): browse, search, delete memories
   - Memory extraction: after each conversation, optionally extract and store key facts

3. **Agent Tools for Tasks & Memory**
   - Task tools (available to all agents via context):
     - `create_task`, `list_tasks`, `update_task`, `complete_task`
   - Memory tools:
     - `remember`, `recall`, `forget`
   - Tools are standard AI SDK v6 `tool()` definitions with Zod schemas
   - Injected into agent context by the framework

4. **Knowledge File Sharing (Documents)**
   - Documents ARE knowledge files — no separate content storage
   - `shared_documents` table: references a file path in `~/knowledge/`, adds isPublic + publicSlug
   - API: `server/api/knowledge/[...path]/share.post.ts` — toggle public, generate slug
   - API: `server/api/view/[slug].get.ts` — fetch shared document (no auth required)
   - Share button in Knowledge editor: mark file as public, copy URL
   - Public viewer (`/view/[slug]`): unauthenticated page, reads file from disk, renders content
     - Markdown rendering with prose styling
     - YAML/JSON rendered as formatted code blocks
     - Minimal layout, meta tags for social sharing
   - Public path added to auth exceptions: `/view/*`, `/api/view/*`

5. **Example Agent**
   - `agents/cognova-agent-example/` — local directory, also serves as GitHub repo template
   - manifest.yaml with all supported fields demonstrated
   - index.ts with createAgent() showing system prompt and tool registration
   - config.schema.json demonstrating supported field types (flat schema)
   - 2-3 example tools with Zod schemas
   - Default knowledge files
   - Comprehensive README for agent authors
   - The default agent (built-in from Phase 3) also serves as a reference

6. **Dashboard Population**
   - Dashboard page now shows real data:
     - Recent conversations
     - Task summary (by status)
     - Token usage chart (daily)
     - Active agents count
     - Memory chunk count

**Dependencies:** Phase 3, Phase 4

**Testing checkpoint:** Verify tasks CRUD, memory store/recall, knowledge file sharing, dashboard data, example agent installation and chat.

**Reference from second-brain:**
- Task system (schema, API, UI — direct port with adaptations)
- Memory system (`server/api/memory/`, `app/pages/memories.vue`)
- Document sharing (`app/pages/view/`)
- Dashboard (`app/pages/dashboard.vue`)

---

### Phase 6: Cron Agents

**Goal:** Users can schedule agents to run on a cron schedule, with budget constraints and run history.

**Deliverables:**

1. **Cron Agent Configuration**
   - API: CRUD for cron agents (`server/api/agents/cron/`)
   - Properties: name, agentId, schedule (cron expression), prompt, enabled, maxTurns, maxBudget
   - Cron agent UI page (`/agents/scheduled`)
   - Configuration form with cron expression helper

2. **Agent Executor Service**
   - `server/services/agent-executor.ts`
   - Uses `node-cron` for scheduling
   - Nitro plugin starts scheduler on boot
   - Execution flow:
     - Create `cron_agent_runs` record (status=running)
     - Load agent via agent loader
     - Execute with `generateText()` (non-streaming, tool loop)
     - Track metrics: tokens, cost, duration, turns
     - Enforce budget constraints (stop if cost > maxBudget)
     - Enforce turn constraints (stop if turns > maxTurns)
     - Update run record with final status and results
     - Log token usage

3. **Run History & Monitoring**
   - Run list per cron agent: status, duration, cost, result preview
   - Run detail: full output, tool calls, token breakdown
   - Cancel running agent
   - Agent registry for tracking active executions

4. **Run Statuses:** running, success, error, budget_exceeded, cancelled

**Dependencies:** Phase 3, Phase 5 (for task/memory tools)

**Reference from second-brain:**
- Cron agents (`server/services/agent-executor.ts`, `server/plugins/04.cron-agents.ts`)
- Agent management UI (`app/pages/agents/`)
- Run history components

---

### Phase 7: MCP Server

**Goal:** Expose Cognova's tools and data via Model Context Protocol for external agent consumption.

**Deliverables:**

1. **MCP SSE Endpoint**
   - `server/routes/mcp.ts` — SSE-based MCP server
   - Authentication via API key

2. **Exposed Tools**
   - Task tools: create, list, update, complete
   - Memory tools: remember, recall, search
   - Knowledge tools: read knowledge files
   - Agent tools: list agents, invoke agent

3. **MCP Configuration**
   - Settings page section for MCP server enable/disable
   - API key management for MCP clients

**Dependencies:** Phase 5 (tools must exist first)

---

### Future: CLI

**Deferred** until web app is stable. Reference second-brain's `cli/` directory closely.

**Planned commands:**
- `cognova init` — interactive setup wizard
- `cognova start` / `stop` / `restart` — service management
- `cognova update` — update with rollback
- `cognova doctor` — diagnostic checks
- `cognova status` — service and health status
- `cognova agent add author/repo` — install agent from GitHub
- `cognova agent remove agent-id` — uninstall agent
- `cognova agent list` — list installed agents
- `cognova agent update [agent-id]` — git pull latest for agent(s)

Agent installs tracked in Cognova's own DB (not npm downloads). Agent devs
publish a GitHub repo with the standard agent structure — no npm publish required.

---

## Technical Standards

### Code Style
- No semicolons
- No brackets for single-line if/loops
- Types in `shared/types/`, never duplicated
- Imports use `~~/` aliases (server) and `~/` aliases (app)

### API Conventions
- Response format: `{ data: result }` for success
- Errors: `createError({ statusCode, message })` with user-friendly messages
- Client-side: all errors displayed via `UToast` (Nuxt UI) — never raw error objects
- Input validation at handler start
- All user-scoped queries filter by userId

### Error Handling Pattern
```
Server: createError({ statusCode: 400, message: 'Human-readable message' })
Client: try/catch → useToast().add({ title: 'Error', description: error.message, color: 'error' })
```
Never expose stack traces, internal errors, or technical details to the user.
Always provide actionable error messages ("Could not connect to provider" not "ECONNREFUSED").

### Testing
Manual user testing with defined checkpoints at the end of each phase.
Each phase plan includes acceptance criteria that serve as the test checklist.
No automated test suite in v1 — revisit when core features are stable.

### File Structure
```
cognova/
├── app/                    # Nuxt 4 app root
│   ├── components/
│   ├── composables/
│   ├── layouts/
│   ├── middleware/
│   ├── pages/
│   ├── plugins/
│   ├── app.vue
│   └── app.config.ts
├── server/
│   ├── api/               # REST endpoints
│   ├── routes/            # WebSocket + special routes
│   ├── services/          # Business logic
│   ├── db/                # Drizzle ORM
│   │   ├── schema/
│   │   ├── migrations/
│   │   └── index.ts
│   ├── ai/                # AI SDK integration
│   │   ├── get-model.ts
│   │   ├── cost.ts
│   │   └── provider.ts
│   ├── agents/            # Agent loading + classification
│   ├── knowledge/         # Knowledge loader + watcher
│   ├── memory/            # Memory manager
│   ├── plugins/           # Nitro startup plugins
│   ├── utils/
│   └── middleware/
├── shared/
│   └── types/
├── docs/
│   ├── PRD.md
│   ├── todo.md
│   └── todo/              # Phase-specific plans
├── docker-compose.yml
├── drizzle.config.ts
├── nuxt.config.ts
└── package.json
```

### Environment Variables
```
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/cognova
BETTER_AUTH_SECRET=<random-secret>
BETTER_AUTH_URL=http://localhost:3000
NUXT_KNOWLEDGE_PATH=~/knowledge

# Optional (admin bootstrap)
NUXT_ADMIN_EMAIL=admin@local.host
NUXT_ADMIN_PASSWORD=<password>
NUXT_ADMIN_NAME=Admin

# Provider keys (configured via UI, but can be set via env)
NUXT_ANTHROPIC_API_KEY=
NUXT_OPENAI_API_KEY=

# Security
NUXT_ENCRYPTION_KEY=<32-byte-hex-for-secrets-encryption>
```

---

## Dependencies to Install

### Phase 1
```
# Core
@nuxt/ui
@nuxt/eslint
drizzle-orm
pg
drizzle-kit
better-auth

# Dev
@types/pg
```

### Phase 2
```
@ai-sdk/anthropic
@ai-sdk/openai
@ai-sdk/openai-compatible
```

### Phase 3
```
ai                          # AI SDK v6 core
js-yaml
chokidar
zod
```

### Phase 4
```
@tiptap/vue-3               # Rich text editor (or via Nuxt UI prose)
codemirror                   # Code editor for YAML/JSON (evaluate need)
```

### Phase 5
```
# Likely no new deps — uses existing AI SDK tools + Drizzle
```

### Phase 6
```
node-cron
```

### Phase 7
```
@modelcontextprotocol/sdk    # MCP server SDK
```
