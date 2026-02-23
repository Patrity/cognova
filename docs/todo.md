---
tags: []
shared: false
---
# Implementation Roadmap

Priority-ordered list of planned features. Each major item links to a detailed plan.

## Priority 1: Foundation

| Feature | Status | Plan |
|---------|--------|------|
| Database Init | Done | [database-init.md](./complete/database-init.md) |
| Auth Layer | Done | [auth.md](./complete/auth.md) |
| Skills System | Done | [skills-system.md](./complete/skills-system.md) |

## Priority 2: Core Features

| Feature | Status | Plan |
|---------|--------|------|
| Task Skill | Done | (included in Skills System) |
| Project Management | Done | Full CRUD, soft delete, color coding, task/doc association |
| Cron Agents | Done | [cron-agents.md](./complete/cron-agents.md) |
| Interactive Chat | Done | WebSocket + Claude Agent SDK streaming chat UI |
| CLI Installer | Done | `cli/` — init, update, start/stop, restart, reset, doctor |
| Memory System | Done | Extraction, session injection, access tracking, search + skill |
| Document Metadata | Done | [document-metadata.md](./complete/document-metadata.md) |
| Document Sharing | Done | Public/private sharing with UUID, SEO control |
| Terminal | Done | Full PTY via node-pty, WebSocket, session persistence |
| File System API | Done | Vault CRUD with path security validation |
| Dashboard | Done | Stat cards, upcoming tasks, recent chats/docs, usage summary |
| Secrets API | Done | Encrypted key-value store with AES encryption |
| Settings Page | Done | Profile, password, secrets management, notification prefs |
| Notifications | Done | Real-time WebSocket event bus across 9 resource types with per-action preferences |
| Hook Analytics | Done | Event tracking, stats, filtering by type/session/tool |
| Token Usage Tracking | Done | Per-source cost breakdown, daily/hourly granularity |
| Docker Deployment | Removed | Deprecated — Cognova requires OS-level access incompatible with containers |
| Secrets Skill | Done | `/secret` slash command for list, get, set, delete |
| Skills Management | Done | [skill-expansion.md](./skill-expansion.md) — browse, toggle, edit, create, agent-generate skills |
| Community Skills Library | Done | [skill-expansion.md](./skill-expansion.md) — GitHub registry sync, install/update, tag filtering |
| AI Conversations | Done | [ai-history.md](./complete/ai-history.md) — DB persistence, list/detail/delete API, chat sidebar integration |
| Multimodal Chat Input | Done | File upload, image paste, drag-and-drop (images, PDFs, code), attachment previews |
| Message Bridge | Done | [message-bridge.md](./complete/message-bridge.md) — Telegram, Discord, iMessage (local + BlueBubbles), Google (Gmail via gogcli). Full bidirectional messaging with Claude Agent SDK responder, webhook receivers, health monitoring, settings UI |
| Search (Basic) | Done | Cmd+K palette with task/document search (ILIKE), navigation shortcuts, action commands |

## Priority 3: Planned

| Feature | Status | Plan |
|---------|--------|------|
| Search (Full-Text) | Done | [search.md](./todo/search.md) — PostgreSQL tsvector + GIN indexes, Cmd+K searches tasks, docs, agents, conversations |
| Memory Reinforcement | Done | [env skill.md](./todo/env%20skill.md) — strong MANDATORY directives in cli template + session-start hook preamble |
| Chat Commands | Planned | Slash commands in chat input for inline actions (e.g. /task, /project, /memory) |
| Workspace Context | Planned | Agent awareness of vault dir for placing/reading files as needed |
| Environment Awareness | Planned | Reinforce agent autonomy — install packages, use OS freely, suggest solutions, ask permission |

## Priority 4: Polish

| Feature | Status | Plan |
|---------|--------|------|
| Editor UX | Planned | [editor-ux.md](./todo/editor-ux.md) — slash commands, bubble toolbar, code highlighting, task lists |
| Keyboard Shortcuts | Planned | Global shortcuts via Nuxt UI `defineShortcuts` (basic nav shortcuts done via Cmd+K) |
| Mobile Responsive | Planned | `sm:`/`md:` breakpoint coverage (currently `lg:` only) |
| Generic Email Adapter | Planned | IMAP/SMTP adapter for non-Gmail providers (bridge infrastructure ready) |
| Bridge Polish | Planned | Retry logic, delivery analytics, auto-reply, `/bridge` skill |

## Priority 5: Future

| Feature | Status | Plan |
|---------|--------|------|
| CLI App URL Setup | Planned | Prompt for public URL during `cli init`, store as APP_URL secret + BETTER_AUTH_URL in .env |
| Obsidian Integration | Planned | Plugin to upload and share documents directly into the vault |
| Semantic Search | Exploring | pgvector embeddings for meaning-based search across vault and memory |
| Table Support | Exploring | TipTap table extensions for markdown editing |
| Image Uploads | Exploring | Drag-and-drop image handling in the editor |
| Google Agent Tools | Exploring | Expose Google services (Calendar, Drive, Contacts, Tasks) as agent tools beyond Gmail bridge |

## Status Key

- **Planned** — Design documented, not started
- **In Progress** — Actively being implemented
- **Done** — Implemented and working

## Dependencies

```
database-init ─┬─► auth
               ├─► task-skill
               ├─► project-management
               ├─► search (basic) ──► search (full-text)
               ├─► secrets-api ──► secrets-skill
               └─► message-bridge

skills-system ─┬─► task-skill
               ├─► cron-agents
               ├─► skills-management ──► community-library
               └─► secrets-skill

message-bridge ─► generic-email-adapter
               ─► bridge-polish
               ─► google-agent-tools

search (full-text) ──► semantic-search
```
