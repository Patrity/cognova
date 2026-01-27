# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Nuxt 4 Application                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐ ┌─────────────────────────────────────────────────────┐   │
│  │   Sidebar    │ │                    Main Area                        │   │
│  │              │ │  ┌─────────────────────────────────────────────┐    │   │
│  │  🧠 Brain    │ │  │              Toolbar (hide/show)            │    │   │
│  │  ──────────  │ │  └─────────────────────────────────────────────┘    │   │
│  │  Dashboard   │ │  ┌────────────┬──────────────────┬─────────────┐    │   │
│  │  Conversations│ │  │            │                  │             │    │   │
│  │  Tasks       │ │  │   File     │                  │  Terminal   │    │   │
│  │  Docs        │ │  │   Tree     │     Editor       │  (Claude)   │    │   │
│  │              │ │  │            │                  │             │    │   │
│  │              │ │  │  UTree +   │   UEditor +      │  xterm.js   │    │   │
│  │              │ │  │  Context   │   EditorToolbar  │             │    │   │
│  │              │ │  │  Menu      │                  │             │    │   │
│  │              │ │  │            │                  ├─────────────┤    │   │
│  │  ──────────  │ │  │            │                  │ Term Input  │    │   │
│  │  👤 User     │ │  └────────────┴──────────────────┴─────────────┘    │   │
│  └──────────────┘ │         UDashboardPanel (resizable)                 │   │
│                   └─────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
         │                    │                         │
         │                    │                         │
         ▼                    ▼                         ▼
┌─────────────────┐  ┌─────────────────┐      ┌─────────────────┐
│   Neon DB       │  │   Vault (fs)    │      │   Claude Code   │
│   (tasks,       │  │   ~/vault/      │      │   CLI           │
│    reminders)   │  │                 │      │                 │
└─────────────────┘  └─────────────────┘      └─────────────────┘
```

## Nuxt UI Components

### Layout Structure

```vue
<template>
  <UDashboardGroup>
    <UDashboardSidebar>
      <!-- Navigation: Dashboard, Conversations, Tasks, Docs -->
      <!-- User menu at bottom -->
    </UDashboardSidebar>

    <UDashboardPanel>
      <!-- Toolbar with hide/show buttons -->

      <UDashboardPanels>
        <!-- File Tree Panel (resizable) -->
        <UDashboardPanel v-if="!hideFileTree" :resize="{ min: 200, max: 400 }">
          <FileTree />
        </UDashboardPanel>

        <!-- Editor Panel (resizable) -->
        <UDashboardPanel v-if="!hideEditor" :resize="{ min: 300 }">
          <MarkdownEditor />
        </UDashboardPanel>

        <!-- Terminal Panel (resizable) -->
        <UDashboardPanel v-if="!hideTerminal" :resize="{ min: 300, max: 600 }">
          <Terminal />
        </UDashboardPanel>
      </UDashboardPanels>
    </UDashboardPanel>
  </UDashboardGroup>
</template>

<script setup>
const hideFileTree = ref(false)
const hideEditor = ref(false)
const hideTerminal = ref(false)
</script>
```

Reference: [Nuxt UI Dashboard Template - Inbox Page](https://github.com/nuxt-ui-templates/dashboard)

### Component Mapping

| UI Element | Nuxt UI Component | Notes |
|------------|-------------------|-------|
| App layout | `UDashboardGroup` | Manages sidebar state |
| Sidebar | `UDashboardSidebar` | Collapsible navigation |
| Main panels | `UDashboardPanel` | With `resize` prop |
| Navigation | `UNavigationMenu` | Sidebar nav items |
| File browser | `UTree` | With `nested: false` for drag-drop |
| Right-click menu | `UContextMenu` | File operations |
| Editor | `UEditor` | TipTap, `content-type="markdown"` |
| Editor toolbar | `UEditorToolbar` | Fixed layout above editor |
| Terminal | xterm.js | Custom component |

## Pages

| Route | Purpose | Layout |
|-------|---------|--------|
| `/` | Dashboard | Sidebar + single panel |
| `/conversations` | Claude Code session history | Sidebar + list/detail |
| `/tasks` | Task management | Sidebar + task list |
| `/docs` | Document workspace | Sidebar + 3-panel (tree/editor/terminal) |

## Data Flow

### File Operations

```
User action in File Tree
        │
        ├─► Create file    → POST /api/fs/write
        ├─► Rename file    → POST /api/fs/rename
        ├─► Delete file    → POST /api/fs/delete
        ├─► Move file      → POST /api/fs/move (drag-drop)
        └─► Open file      → GET /api/fs/read → Load in Editor
```

### Editor Save

```
User edits in UEditor (WYSIWYG)
        │
        ▼
Editor emits markdown content
        │
        ▼
POST /api/fs/write { path, content }
        │
        ▼
Server writes to vault filesystem
```

### Terminal Communication

```
Browser (xterm.js)  ←──WebSocket──►  Nitro Server  ←──PTY──►  bash/claude
```

## Vault Structure

```
~/vault/                          # Bind-mounted in container
├── inbox/                        # Quick captures
├── areas/                        # Ongoing responsibilities
│   ├── health/
│   ├── finance/
│   └── career/
├── projects/                     # Active projects
├── resources/                    # Reference material
├── archive/                      # Completed/inactive
└── .claude/                      # Claude Code config
    ├── CLAUDE.md
    ├── commands/                 # Custom skills
    │   ├── tasks/
    │   └── remind/
    └── settings.json
```

## Deployment

### Docker Compose

```yaml
services:
  second-brain:
    build: .
    container_name: second-brain
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      # Vault directory
      - ${VAULT_PATH:-~/vault}:/vault:rw
      # Claude Code config (for skills, settings)
      - ${HOME}/.claude:/home/node/.claude:rw
      - ${HOME}/.anthropic:/home/node/.anthropic:ro
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - VAULT_PATH=/vault
      - GOTIFY_URL=${GOTIFY_URL}
      - GOTIFY_TOKEN=${GOTIFY_TOKEN}
```

### Dockerfile

```dockerfile
FROM node:22-bookworm

# Install Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

# Install node-pty build dependencies
RUN apt-get update && apt-get install -y \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Build app
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

### Coolify Deployment

1. Connect GitHub repo
2. Set environment variables
3. Configure your domain
4. Set up authentication at reverse proxy layer

## Security

| Layer | Approach |
|-------|----------|
| Authentication | External (reverse proxy, SSO, etc.) |
| Database | Neon with SSL required |
| Filesystem | Container bind-mount, isolated to vault |
| API keys | Environment variables, not in repo |

## File Structure (Nuxt App)

```
second-brain-app/
├── app/
│   ├── pages/
│   │   ├── index.vue              # Dashboard
│   │   ├── conversations.vue      # Session history
│   │   ├── tasks.vue              # Task management
│   │   └── docs.vue               # Document workspace (3-panel)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppSidebar.vue
│   │   │   └── AppToolbar.vue
│   │   ├── files/
│   │   │   ├── FileTree.vue       # UTree wrapper
│   │   │   └── FileContextMenu.vue
│   │   ├── editor/
│   │   │   └── MarkdownEditor.vue # UEditor wrapper
│   │   ├── terminal/
│   │   │   └── Terminal.vue       # xterm.js
│   │   ├── tasks/
│   │   │   ├── TaskList.vue
│   │   │   └── TaskForm.vue
│   │   └── dashboard/
│   │       ├── QuickCapture.vue
│   │       └── RecentNotes.vue
│   ├── composables/
│   │   ├── useFileTree.ts
│   │   ├── useEditor.ts
│   │   ├── useTerminal.ts
│   │   └── useTasks.ts
│   └── layouts/
│       └── default.vue
├── server/
│   ├── api/
│   │   ├── fs/
│   │   │   ├── read.post.ts
│   │   │   ├── write.post.ts
│   │   │   ├── list.get.ts
│   │   │   ├── move.post.ts
│   │   │   ├── rename.post.ts
│   │   │   └── delete.post.ts
│   │   ├── tasks/
│   │   │   └── [...].ts
│   │   └── conversations/
│   │       └── [...].ts
│   ├── routes/
│   │   └── terminal.ts            # WebSocket handler
│   └── utils/
│       ├── pty-manager.ts
│       └── path-validator.ts
├── nuxt.config.ts
├── Dockerfile
└── docker-compose.yml
```
