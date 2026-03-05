# Phase 3: Agent Runtime & Chat

**Goal:** End-to-end streaming chat works. User sends a message, system routes to an agent, agent processes with AI SDK v6, response streams back.

**Status:** Complete
**Depends on:** Phase 1, Phase 2

---

## Completed Tasks

### 3.1 Agent Type System
- [x] `shared/types/agent.ts` — `AgentManifest`, `CognovaAgent`, `AgentContext`, `CreateAgentFn`
- [x] Exported from `shared/types/index.ts`

### 3.2 Knowledge Loader (minimal v1)
- [x] `server/knowledge/types.ts` — `IKnowledgeLoader` interface
- [x] `server/knowledge/fs-loader.ts` — Filesystem implementation with 5-min TTL cache
- [x] `server/knowledge/index.ts` — `getKnowledgeLoader()` lazy singleton
- [x] Supports `.md`, `.txt`, `.json` files
- [x] Missing directory returns empty knowledge gracefully
- Deferred: chokidar file watcher (Phase 5), YAML support (Phase 4)

### 3.3 Default Agent + Seed
- [x] `server/agents/built-in/default/index.ts` — general-purpose assistant with knowledge injection
- [x] `server/plugins/04.default-agent-seed.ts` — seeds "Default Assistant" on boot

### 3.4 Agent Loader + Model Resolver
- [x] `server/agents/loader.ts` — `loadAgent(agentId, userId)` assembles context, calls `createAgent()`
- [x] `server/agents/resolve-model.ts` — resolves model with priority: explicit modelId > defaultModelId setting > agent tags > frontier fallback

### 3.5 Conversation Persistence APIs
- [x] `server/api/conversations/index.get.ts` — list (ordered by updatedAt DESC)
- [x] `server/api/conversations/index.post.ts` — create `{ agentId?, title? }`
- [x] `server/api/conversations/[id].get.ts` — get conversation + messages
- [x] `server/api/conversations/[id].put.ts` — update title
- [x] `server/api/conversations/[id].delete.ts` — cascade delete
- [x] `server/api/agents/index.get.ts` — list enabled installed agents
- All routes enforce userId ownership

### 3.6 Chat Streaming API
- [x] `server/api/conversations/[id]/chat.post.ts` — core streaming endpoint
- [x] Verify conversation ownership
- [x] Load agent via `loadAgent()`, resolve model via `resolveModelForAgent()`
- [x] Save user message to DB (parts in content jsonb)
- [x] Auto-title from first ~80 chars of first message
- [x] `streamText()` with `onFinish` for assistant message persistence
- [x] Token usage logging via `logTokenUsage()`
- [x] `toUIMessageStreamResponse()` with `messageMetadata` callback
- [x] Message metadata: model, inputTokens, outputTokens, durationMs

### 3.7 Chat UI
- [x] `app/pages/chat.vue` — layout with sidebar panel + `<NuxtPage />`
- [x] `app/pages/chat/index.vue` — new chat welcome page with agent selector
- [x] `app/pages/chat/[id].vue` — active chat with `@ai-sdk/vue` `Chat` class + `DefaultChatTransport`
- [x] `app/components/chat/MessageBubble.vue` — message display with MDC rendering, info popover (model, tokens, duration, tok/s), reactive relative time, copy button
- [x] `app/components/chat/ChatInput.vue` — input with send/stop buttons
- [x] `app/components/chat/ConversationList.vue` — sidebar conversation list with delete
- [x] `app/components/chat/AgentSelect.vue` — agent selector dropdown
- [x] `app/utils/message-converter.ts` — `dbMessageToUIMessage()` with metadata passthrough
- [x] `app/utils/formatting.ts` — `formatRelativeTime()`, `formatCost()`
- [x] Auto-scroll on new messages
- [x] Thinking indicator (pulsing dot)
- [x] Sidebar title refresh after stream completes
- [x] First message from query param (new chat flow)

### 3.8 Infrastructure Fixes
- [x] SSR disabled globally (`ssr: false` in nuxt.config.ts) — auth-gated SPA, no SEO benefit
- [x] Provider PUT preserves masked API keys (detects `••••••••` mask, keeps existing decrypted value)
- [x] `sanitizeForHeader()` for openai-compatible provider (non-ASCII in name/apiKey)
- [x] Password manager ignore attributes on API key inputs
- [x] `MessageMetadata` type + `metadata` jsonb column on messages table

---

## Deferred Items

| Item | Deferred To | Reason |
|------|-------------|--------|
| WebSocket endpoint | Later | SSE via AI SDK sufficient; `Chat.stop()` uses AbortController |
| chokidar file watcher | Phase 5 | TTL cache sufficient for now |
| YAML knowledge files | Phase 4 | Only .md/.txt/.json in v1 |
| Conversation search | Later | Simple list for now |
| Code syntax highlighting | Later | MDC handles basic rendering |
| Image paste / attachments | Later | Base64 passthrough deferred |

---

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| `@ai-sdk/vue` `Chat` class instead of custom composable | Official pattern from Nuxt UI chat template, handles streaming state |
| `DefaultChatTransport` over custom SSE | AI SDK provides transport layer, reduces boilerplate |
| Custom MessageBubble over UChatMessages | More control over layout, info popover, metadata display |
| `messageMetadata` callback on `toUIMessageStreamResponse` | Only way to send per-message stats (model, tokens, duration) through SSE stream |
| Model resolution priority: explicit > defaultModelId > tags > frontier | User's default setting should override agent manifest tags |
| Global `ssr: false` over route-level | Auth-gated app, no SEO benefit, avoids hydration mismatches |
| `metadata` jsonb column on messages | Flexible storage for model, tokens, duration without schema changes |
