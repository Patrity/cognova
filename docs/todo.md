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
| Cron Agents | Done | [cron-agents.md](./complete/cron-agents.md) |
| Interactive Chat | Done | WebSocket + Claude Agent SDK streaming chat UI |
| CLI Installer | Done | `cli/` — init, update, start/stop, reset |
| Memory Dashboard | Done | Memory context viewer + skill |
| Notifications | Planned | [notifications.md](./todo/notifications.md) |
| Search | Planned | [search.md](./todo/search.md) |
| Document Metadata | Done | [document-metadata.md](./complete/document-metadata.md) |

## Priority 3: Advanced

| Feature | Status | Plan |
|---------|--------|------|
| AI History | Partial | [ai-history.md](./todo/ai-history.md) — chat conversations stored, JSONL parsing not yet done |

## Priority 4: Polish

| Feature | Status | Plan |
|---------|--------|------|
| Editor UX | Planned | [editor-ux.md](./todo/editor-ux.md) |

## Status Key

- **Planned** - Design documented, not started
- **In Progress** - Actively being implemented
- **Done** - Implemented and working
- **Blocked** - Waiting on dependency

## Dependencies

```
database-init ─┬─► auth
               ├─► task-skill ──► notifications
               ├─► ai-history
               └─► search

skills-system ─► task-skill
              └─► cron-agents
```

## Quick Wins (No Plan Needed)

Minor improvements that can be done inline:

- [ ] Add loading states to file tree operations
- [ ] Keyboard shortcuts for common actions (NuxtUI Shortcut Composable)
- [ ] Mobile responsive improvements
