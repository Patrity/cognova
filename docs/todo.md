# Cognova — Progress Tracker

> Current focus: Phase 4 — Agent Management & Knowledge Editor

## Phases

| Phase | Name | Status | Plan |
|-------|------|--------|------|
| 1 | Foundation & Infrastructure | **Complete** | [phase-1-foundation.md](todo/phase-1-foundation.md) |
| 2 | Settings & Provider Management | **Complete** | [phase-2-providers.md](todo/phase-2-providers.md) |
| 3 | Agent Runtime & Chat | **Complete** | [phase-3-chat.md](todo/phase-3-chat.md) |
| 4 | Agent Management & Knowledge Editor | Not started | [phase-4-agent-management.md](todo/phase-4-agent-management.md) |
| 5 | Tasks, Memory & Documents | Not started | [phase-5-tasks-memory-docs.md](todo/phase-5-tasks-memory-docs.md) |
| 6 | Cron Agents | Not started | [phase-6-cron-agents.md](todo/phase-6-cron-agents.md) |
| 7 | MCP Server | Not started | [phase-7-mcp.md](todo/phase-7-mcp.md) |
| — | CLI (includes `cognova agent add`) | Deferred | — |

## Active Tasks

_Phase 3 complete — awaiting Phase 4 kickoff._

## Decisions Log

| Date | Decision | Context |
|------|----------|---------|
| 2026-03-04 | Product name: Cognova | — |
| 2026-03-04 | DB driver: node-postgres (pg) | Not Neon, standard driver for persistent server |
| 2026-03-04 | Agent format: GitHub repos or local directories | No npm publish required for agent devs |
| 2026-03-04 | Agent distribution: `cognova agent add author/repo` (CLI) or GitHub URL (web UI) | Registry page removed — CLI handles discovery |
| 2026-03-04 | Scope includes: cron agents, memory, knowledge file sharing | Added to phases 5-6 |
| 2026-03-04 | No intent classifier: users select agents manually, default agent pre-selected | Simpler than keyword matching |
| 2026-03-04 | Chat: SSE primary, WS for bidirectional | AI SDK v6 streamText for SSE |
| 2026-03-04 | Memory: custom now, Mem0-ready interface (IMemoryManager) | Swap backing store later |
| 2026-03-04 | Knowledge: IKnowledgeLoader interface | Filesystem now, S3/DB for cloud later |
| 2026-03-04 | Documents = knowledge files with public sharing | No separate document entity |
| 2026-03-04 | Settings: full (app, account, providers, secrets) | Phase 2 |
| 2026-03-04 | CLI: deferred until web app is stable | Includes agent add/remove/update |
| 2026-03-04 | Attachments: base64 passthrough, no file storage | v1 simplicity |
| 2026-03-04 | Error UX: UToast for all user-facing errors | Consistent Nuxt UI pattern |
| 2026-03-04 | Testing: manual with checkpoints per phase | No automated suite in v1 |
| 2026-03-04 | Encryption: AES-256-GCM for secrets + provider keys | Supports future cloud hosting |
| 2026-03-04 | Provider types table: dynamic, not hardcoded | Supports BYOK multi-tenant, multiple instances per type |
| 2026-03-04 | JSON Schema forms: flat schemas only | No nested allOf/oneOf/conditional support |
| 2026-03-05 | Chat UI: @ai-sdk/vue Chat class + DefaultChatTransport | Official Nuxt UI chat template pattern |
| 2026-03-05 | Custom MessageBubble over UChatMessages | More control for info popover, metadata, copy |
| 2026-03-05 | Model resolution: explicit > defaultModelId > tags > frontier | User default setting overrides agent manifest |
| 2026-03-05 | Global ssr: false | Auth-gated SPA, no SEO benefit, avoids hydration mismatches |
| 2026-03-05 | Message metadata in jsonb column | Flexible per-message stats (model, tokens, duration) |
| 2026-03-05 | Knowledge loader: TTL cache, no chokidar | File watcher deferred to Phase 5 |
