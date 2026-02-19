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
| Docker Deployment | Done | Dockerfile, docker-compose, health checks, volume support |
| Secrets Skill | Done | `/secret` slash command for list, get, set, delete |
| Skills Management | Done | [skill-expansion.md](./skill-expansion.md) — browse, toggle, edit, create, agent-generate skills |
| Community Skills Library | Done | [skill-expansion.md](./skill-expansion.md) — GitHub registry sync, install/update, tag filtering |

## Priority 3: Planned

| Feature | Status | Plan |
|---------|--------|------|
| Search | Planned | [search.md](./todo/search.md) — unified full-text search across resources |
| Memory Reinforcement | Planned | [env skill.md](./todo/env%20skill.md) — relevance decay, access-based scoring, expiration cleanup |
| AI History Export | Planned | [ai-history.md](./todo/ai-history.md) — JSONL parsing for conversation export |

## Priority 4: Polish

| Feature | Status | Plan |
|---------|--------|------|
| Editor UX | Planned | [editor-ux.md](./todo/editor-ux.md) |
| Keyboard Shortcuts | Planned | Global shortcuts via Nuxt UI `defineShortcuts` |
| Mobile Responsive | Planned | `sm:`/`md:` breakpoint coverage (currently `lg:` only) |

## Priority 5: Future

| Feature | Status | Plan |
|---------|--------|------|
| Obsidian Integration | Planned | Plugin to upload and share documents directly into the vault |
| Semantic Search | Exploring | pgvector embeddings for meaning-based search across vault and memory |
| Table Support | Exploring | TipTap table extensions for markdown editing |
| Image Uploads | Exploring | Drag-and-drop image handling in the editor |

## Status Key

- **Planned** — Design documented, not started
- **In Progress** — Actively being implemented
- **Done** — Implemented and working

## Dependencies

```
database-init ─┬─► auth
               ├─► task-skill
               ├─► project-management
               ├─► search
               └─► secrets-api

skills-system ─┬─► task-skill
               ├─► cron-agents
               ├─► skills-management
               └─► community-library

secrets-api ───► secrets-skill

skills-management ──► community-library
```
