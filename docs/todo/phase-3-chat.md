# Phase 3: Agent Runtime & Chat

**Goal:** End-to-end streaming chat works. User sends a message, system routes to an agent, agent processes with AI SDK v6, response streams back.

**Status:** Not started
**Depends on:** Phase 1, Phase 2

---

## Tasks

### 3.1 Agent Type System
- [ ] Create `shared/types/agent.ts`:
  - `AgentManifest` — parsed manifest.yaml structure
  - `CognovaAgent` — returned by createAgent(): { systemPrompt, tools, onMessage?, onStart? }
  - `AgentContext` — passed to createAgent(): { getConfig, knowledge, getModel, memory, userId }
  - `AgentConfig` — typed config values from agent_configs
- [ ] Install `js-yaml` + `@types/js-yaml`

### 3.2 Agent Loader
- [ ] Create `server/agents/loader.ts`
- [ ] `loadAgent(agentId)`:
  - Read `installed_agents` record from DB
  - Resolve local path (cloned repo dir or local directory)
  - Dynamic import of agent's index.ts
  - Assemble `AgentContext` (getConfig, knowledge, getModel wrappers)
  - Call `createAgent(config, context)` and cache result
- [ ] Cache with invalidation on config change or knowledge file change
- [ ] Built-in agent special case (default agent loaded from local code)

### 3.3 Knowledge Loader (IKnowledgeLoader)
- [ ] Create `server/knowledge/types.ts` — IKnowledgeLoader interface:
  - `load(agentId): Promise<AgentKnowledge>`
  - `invalidate(agentId): void`
  - `watch(): void` / `stop(): void`
- [ ] Create `server/knowledge/fs-loader.ts` — filesystem implementation:
  - `loadKnowledge(agentId)`: read ~/knowledge/[agentId]/ directory
  - Parse .yaml → objects, .json → objects, .md → text
  - Return structured `AgentKnowledge` object
  - Handle missing directory gracefully (empty knowledge)
  - chokidar watcher on ~/knowledge/
  - On add/change/unlink: identify agent from path, invalidate cache
  - Debounce events (100ms)
- [ ] Create `server/plugins/03.knowledge-watcher.ts` — start watcher on boot
- [ ] Install `chokidar`
- [ ] Interface allows future swap to S3/DB-backed loader for cloud

### 3.4 Default Agent (built-in)
- [ ] Create `server/agents/built-in/default/index.ts`
- [ ] General-purpose system prompt (helpful assistant)
- [ ] No specialized tools initially (tools added in Phase 5)
- [ ] Registered in `installed_agents` as builtIn on first boot
- [ ] Create `server/agents/built-in/default/manifest.yaml`
- [ ] Serves as reference implementation for agent authors
- [ ] No intent classifier — users select agents manually, default is pre-selected

### 3.6 Chat API (SSE)
- [ ] Create `server/api/chat.post.ts`
  - Input: `{ conversationId?, agentId?, message: string, attachments?: [] }`
  - Create conversation if new (auto-title from first message)
  - Save user message to DB
  - Resolve agent: use agentId if provided, otherwise default agent
  - Attachments: base64 passthrough to model (no file storage)
  - Load agent via loader
  - Call `getModel()` for agent's model preference
  - Load conversation history from DB
  - Assemble messages array (system prompt + knowledge + history + new message)
  - Call `streamText()` from AI SDK v6
  - Return as SSE: set `Content-Type: text/event-stream`
  - On completion: persist assistant message + tool calls, log token usage
  - Handle tool loop (AI SDK v6 handles multi-step tool calls)
- [ ] Install `ai` (AI SDK v6 core), `zod`

### 3.7 WebSocket Endpoint
- [ ] Create `server/routes/_ws/chat.ts`
  - Auth via session cookie
  - Message types: `chat:interrupt`, `chat:typing`
  - `chat:interrupt`: abort controller on active stream
  - Forward to SSE endpoint or handle directly
- [ ] Keep optional — SSE is the primary transport

### 3.8 Chat Composable
- [ ] Create `app/composables/useChat.ts`
  - `sendMessage(message, conversationId?, agentId?)` — POST to /api/chat, read SSE stream
  - `conversations` — reactive list from API
  - `messages` — reactive list for current conversation
  - `isStreaming` — reactive boolean
  - `streamingContent` — reactive string (accumulates during stream)
  - `loadConversation(id)` — fetch messages
  - `createConversation()` — new conversation
  - `deleteConversation(id)`
  - `interrupt()` — abort current stream (via WS or AbortController)

### 3.9 Chat UI
- [ ] Create `app/pages/chat.vue` — conversation list + main area
- [ ] Create `app/pages/chat/[id].vue` — specific conversation
- [ ] Components:
  - `app/components/chat/ConversationList.vue` — sidebar list with search
  - `app/components/chat/MessageList.vue` — scrolling message area
  - `app/components/chat/MessageBubble.vue` — single message (user/assistant)
  - `app/components/chat/ChatInput.vue` — text input with send button
  - `app/components/chat/ToolCallBlock.vue` — collapsible tool call display
  - `app/components/chat/AgentSelector.vue` — dropdown to select agent (default pre-selected)
  - `app/components/chat/StreamingIndicator.vue` — typing/streaming dots
- [ ] Markdown rendering for assistant messages (via Nuxt UI prose or MDC)
- [ ] Auto-scroll on new content
- [ ] Code block syntax highlighting
- [ ] Image paste support in input

### 3.10 Conversation Persistence
- [ ] API: `server/api/conversations/index.get.ts` — list conversations
- [ ] API: `server/api/conversations/[id].get.ts` — get conversation with messages
- [ ] API: `server/api/conversations/[id].delete.ts` — delete conversation
- [ ] API: `server/api/conversations/search.get.ts` — full-text search
- [ ] Auto-title: use first ~50 chars of first message, or LLM-generated summary

---

## Acceptance Criteria

1. User can start a new chat conversation
2. Message is sent and response streams back in real-time
3. Tool calls are displayed with expandable input/output
4. Conversation persists — reload shows history
5. Multiple conversations in sidebar
6. Agent selector allows choosing an agent (default pre-selected)
7. Knowledge files loaded and included in agent context
8. Token usage logged per message
9. Stream can be interrupted
10. Errors display as UToast notifications with user-friendly messages
