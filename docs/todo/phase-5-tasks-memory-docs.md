# Phase 5: Tasks, Memory & Documents

**Goal:** Agents can create/manage tasks, remember context across sessions, and users can share knowledge files publicly.

**Status:** Not started
**Depends on:** Phase 3, Phase 4

---

## Tasks

### 5.1 Task System — API
- [ ] API: `server/api/tasks/index.get.ts` — list tasks (filter by status, priority, project, tags)
- [ ] API: `server/api/tasks/index.post.ts` — create task
- [ ] API: `server/api/tasks/[id].get.ts` — get task
- [ ] API: `server/api/tasks/[id].put.ts` — update task
- [ ] API: `server/api/tasks/[id].delete.ts` — delete task
- [ ] API: `server/api/tasks/tags.get.ts` — list unique tags
- [ ] API: `server/api/projects/index.get.ts` — list projects
- [ ] API: `server/api/projects/index.post.ts` — create project
- [ ] API: `server/api/projects/[id].put.ts` — update project
- [ ] API: `server/api/projects/[id].delete.ts` — soft delete project

### 5.2 Task System — UI
- [ ] Create `app/pages/tasks.vue`
- [ ] Create `app/composables/useTasks.ts`
- [ ] Task list with columns: title, status, priority, project, due date
- [ ] Filter bar: status, priority, project, tags
- [ ] Inline status toggle (click to cycle: todo → in_progress → done)
- [ ] Task detail panel/modal: full edit form
- [ ] New task form: title, description, status, priority, project, tags, dueDate
- [ ] Project sidebar or dropdown filter
- [ ] Empty state with CTA

### 5.3 Memory System — Backend
- [ ] Create `server/memory/types.ts` — IMemoryManager interface:
  ```typescript
  interface IMemoryManager {
    store(chunk: NewMemoryChunk): Promise<MemoryChunk>
    search(query: string, filters?: MemoryFilters): Promise<MemoryChunk[]>
    getContext(agentId: string, userId: string): Promise<string>
    forget(id: string): Promise<void>
    extractFromConversation(messages: Message[]): Promise<MemoryChunk[]>
  }
  ```
- [ ] Create `server/memory/pg-manager.ts` — PostgreSQL implementation:
  - ILIKE search on content field (upgrade to tsvector later)
  - `getContext()`: assemble relevant memories into text block for system prompt
  - `extractFromConversation()`: use LLM to extract key facts after conversation ends
- [ ] Interface designed for Mem0 swap — future `server/memory/mem0-manager.ts` would implement same interface
- [ ] Chunk types: decision, fact, solution, pattern, preference, summary

### 5.4 Memory System — API & UI
- [ ] API: `server/api/memory/index.get.ts` — list/search memories
- [ ] API: `server/api/memory/index.post.ts` — store memory
- [ ] API: `server/api/memory/[id].delete.ts` — forget memory
- [ ] API: `server/api/memory/context.get.ts` — get context for agent/user
- [ ] Create `app/pages/memories.vue`
- [ ] Memory list with search bar
- [ ] Filter by type (decision, fact, etc.)
- [ ] Delete individual memories
- [ ] Memory detail view

### 5.5 Agent Tools — Tasks & Memory
- [ ] Create `server/agents/tools/tasks.ts`
  - `create_task` — Zod schema: { title, description?, status?, priority?, projectId?, tags? }
  - `list_tasks` — Zod schema: { status?, priority?, projectId?, limit? }
  - `update_task` — Zod schema: { id, title?, status?, priority?, description? }
  - `complete_task` — Zod schema: { id }
- [ ] Create `server/agents/tools/memory.ts`
  - `remember` — Zod schema: { content, type, metadata? }
  - `recall` — Zod schema: { query, type?, limit? }
  - `forget` — Zod schema: { id }
- [ ] Register tools in AgentContext (available to all agents)
- [ ] Tools execute with the current user's userId for scoping

### 5.6 Knowledge File Sharing (Documents)
Documents ARE knowledge files — no separate content storage.
- [ ] API: `server/api/knowledge/[...path]/share.post.ts` — toggle public, generate slug
- [ ] API: `server/api/view/[slug].get.ts` — fetch shared file content (no auth)
- [ ] Create `app/pages/view/[slug].vue` — public viewer (public layout, no auth)
  - Markdown: rendered with prose styling
  - YAML/JSON: rendered as formatted code blocks
  - Minimal, clean design
  - Meta tags for social sharing (title, description, og:tags)
- [ ] Share button in Knowledge editor (Phase 4): toggle public, copy URL to clipboard
- [ ] `shared_documents` table tracks: filePath, isPublic, publicSlug
- [ ] Public paths added to auth exceptions: `/view/*`, `/api/view/*`

### 5.7 Example Agent
- [ ] Create `agents/cognova-agent-example/` — local directory, GitHub repo template
- [ ] `manifest.yaml` — all supported fields demonstrated
- [ ] `index.ts` — createAgent() with system prompt and tool registration
- [ ] `config.schema.json` — examples of supported field types (flat schema only)
- [ ] `tools/greet.ts` — simple example tool
- [ ] `tools/calculate.ts` — tool with multiple parameters
- [ ] `knowledge/example.yaml` — example knowledge file
- [ ] `README.md` — comprehensive guide for agent authors

### 5.8 Dashboard Population
- [ ] Wire dashboard cards to real data:
  - Recent conversations (last 5)
  - Task summary (count by status)
  - Token usage (last 7 days chart)
  - Active agents count
  - Memory chunk count
- [ ] Create `server/api/dashboard.get.ts` — aggregated dashboard data

---

## Acceptance Criteria

1. Tasks CRUD works end-to-end (API + UI)
2. Tasks filterable by status, priority, project
3. Agents can create/update/complete tasks via tool calls
4. Memory chunks stored after conversations
5. Agents can recall relevant memories via tool calls
6. Memory page shows searchable list
7. Knowledge files can be shared publicly via share button in editor
8. Public URL renders knowledge file without authentication
9. Dashboard shows real data from all subsystems
10. Example agent installs and works correctly
11. All errors show as UToast with user-friendly messages
