---
tags: []
shared: false
---
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
│  │  🧠 Cognova  │ │  │              Toolbar (hide/show)            │    │   │
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
│   (tasks,       │  │   ~/vault/      │      │   CLI + SDK     │
│    agents)      │  │                 │      │                 │
└─────────────────┘  └─────────────────┘      └─────────────────┘
```

## WebSocket Communication

```
┌─────────────────────────────────────────────────────────────────┐
│                    WebSocket Endpoints                           │
├─────────────────────────────────────────────────────────────────┤
│  /terminal        │  PTY-based terminal (xterm.js ↔ node-pty)   │
│  /notifications   │  Real-time event bus (agent status, toasts) │
│  /_ws/chat        │  Interactive Claude chat (Agent SDK stream) │
└─────────────────────────────────────────────────────────────────┘
```

**Important**: WebSocket handlers live in `server/routes/` but must not
collide with Nuxt page routes. Use the `_ws/` prefix for any WebSocket
handler that shares a name with a page (e.g. `server/routes/_ws/chat.ts`
so it doesn't block `app/pages/chat.vue`).

## Interactive Chat System

```
Browser (Vue)                    Nuxt Server                     Claude Agent SDK
┌─────────────┐    WebSocket    ┌───────────────┐    query()    ┌──────────────┐
│ useChat()   │◄──────────────►│ _ws/chat.ts   │──────────────►│ Agent loop   │
│ composable  │  typed protocol │ chat-session  │  async iter   │ (tools, bash │
│             │                 │ -manager.ts   │◄──────────────│  file edit)  │
└─────────────┘                 └───────────────┘               └──────────────┘
                                       │
                                       ▼
                                ┌───────────────┐
                                │  PostgreSQL    │
                                │  conversations │
                                │  conv_messages │
                                └───────────────┘
```

- WebSocket route streams SDK messages to browser in real-time
- REST endpoints (`/api/conversations/`) serve conversation history
- SDK sessions can be resumed via stored `sdkSessionId`
- Fire-and-forget streaming loop keeps WS responsive for interrupts

## Scheduled Agents System

```
┌───────────────────────────────────────────────────────────────────────┐
│                         Cron Scheduler                                 │
│  Manages scheduled jobs via 'cron' package                             │
│  Initialized at server startup via Nitro plugin                        │
└─────────────────────────────┬─────────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────────────┐
│                        Agent Executor                                  │
│                                                                        │
│  ┌─────────────┐  ┌───────────────┐  ┌────────────────────────────┐   │
│  │ Agent       │  │ Claude Agent  │  │ Notification Bus           │   │
│  │ Registry    │◄─│ SDK query()   │─►│ (broadcasts to WebSocket)  │   │
│  │ (cancel)    │  │ streaming     │  │                            │   │
│  └─────────────┘  └───────────────┘  └────────────────────────────┘   │
│                                                                        │
│  Features:                                                             │
│  - Cancellation support via AgentRegistry                              │
│  - Cost/token tracking from SDK                                        │
│  - Real-time status via WebSocket notifications                        │
│  - Orphaned run cleanup on startup                                     │
└───────────────────────────────────────────────────────────────────────┘
```

See [cron-agents.md](./complete/cron-agents.md) for full implementation details.

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
| `/` | Homepage (custom via `vault/index.md` or default landing) | Landing page |
| `/login` | Authentication | Auth layout |
| `/dashboard` | Overview with quick capture and recent activity | Sidebar + single panel |
| `/tasks` | Task management | Sidebar + task list |
| `/docs` | Document workspace | Sidebar + 3-panel (tree/editor/terminal) |
| `/chat` | Interactive Claude chat | Sidebar + conversation list/chat |
| `/agents` | Scheduled agents dashboard | Stats, chart, agent cards |
| `/agents/[id]` | Agent detail | Stats, run history, controls |
| `/hooks` | Hook event log and stats | Sidebar + event list |
| `/memories` | Memory dashboard | Sidebar + memory list |
| `/settings` | User profile, password, API secrets | Sidebar + settings forms |
| `/view/[uuid]` | Public document viewer (no auth) | Standalone with TOC |

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

### Bare-Metal (CLI)

The `cognova` CLI handles installation, updates, and process management.

```bash
# Install globally
npm i -g cognova

# Initialize (copies app to ~/cognova, sets up .env, builds)
cognova init

# Process management
cognova start     # PM2 start
cognova stop      # PM2 stop
cognova status    # Health check
cognova logs      # PM2 logs

# Update to latest version
cognova update    # Downloads, installs deps, migrates DB, rebuilds, restarts
```

**Install directory**: `~/cognova/` (or custom via `init --dir`)

**Process manager**: PM2 with `ecosystem.config.cjs` — loads `.env` via `env_file`.

**Database migrations**: Auto-run on production startup via `server/plugins/01.database.ts`.
The CLI `update` command also runs `pnpm db:migrate` as a safety net.

### Development Deployment (git-based)

When the CLI isn't published to npm yet, deploy from the repo:

```bash
# On the VM, in the repo clone
git pull
pnpm install
pnpm db:generate   # if schema changed
pnpm build

# Sync to install dir (exclude config/state files)
rsync -av --delete \
  --exclude='.env' --exclude='node_modules' --exclude='.output' \
  --exclude='logs' --exclude='.api-token' --exclude='.cognova' \
  --exclude='ecosystem.config.cjs' \
  ./ ~/bridget/

# Rebuild in install dir
cd ~/bridget && pnpm install && pnpm build

# Restart
pm2 restart cognova
```

## Security

| Layer | Approach |
|-------|----------|
| Authentication | BetterAuth (session-based) + reverse proxy recommended for production |
| Database | Neon with SSL required |
| Filesystem | Container bind-mount, isolated to vault |
| API keys | Environment variables, not in repo |

## File Structure (Nuxt App)

```
cognova/
├── app/
│   ├── pages/
│   │   ├── index.vue              # Homepage (custom or default landing)
│   │   ├── login.vue              # Authentication
│   │   ├── dashboard.vue          # Overview + quick capture
│   │   ├── tasks.vue              # Task management
│   │   ├── docs.vue               # Document workspace (3-panel)
│   │   ├── chat.vue               # Interactive Claude chat
│   │   ├── memories.vue           # Memory dashboard
│   │   ├── hooks.vue              # Hook event log + stats
│   │   ├── settings.vue           # User profile + API secrets
│   │   ├── agents/
│   │   │   ├── index.vue          # Agents dashboard
│   │   │   └── [id].vue           # Agent detail page
│   │   └── view/
│   │       └── [uuid].vue         # Public document viewer
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppSidebar.vue
│   │   │   └── AppToolbar.vue
│   │   ├── files/
│   │   │   ├── FileTree.vue
│   │   │   └── FileContextMenu.vue
│   │   ├── editor/
│   │   │   └── MarkdownEditor.vue
│   │   ├── terminal/
│   │   │   └── Terminal.vue       # xterm.js
│   │   ├── chat/
│   │   │   ├── MessageBubble.vue      # User/assistant message render
│   │   │   ├── ToolCallBlock.vue      # Collapsible tool call display
│   │   │   ├── StreamingMessage.vue   # Live streaming text + tools
│   │   │   ├── ChatInput.vue          # Textarea + send/interrupt
│   │   │   └── ConversationList.vue   # Sidebar conversation list
│   │   ├── tasks/
│   │   │   ├── TaskList.vue
│   │   │   └── TaskForm.vue
│   │   ├── agents/
│   │   │   ├── AgentForm.vue
│   │   │   ├── AgentStatsCards.vue
│   │   │   ├── AgentActivityChart.client.vue
│   │   │   ├── AgentActivityChart.server.vue
│   │   │   └── AgentRunModal.vue
│   │   └── dashboard/
│   │       ├── QuickCapture.vue
│   │       └── RecentNotes.vue
│   ├── composables/
│   │   ├── useFileTree.ts
│   │   ├── useEditor.ts
│   │   ├── useTerminal.ts
│   │   ├── useTasks.ts
│   │   ├── useAgents.ts           # Agent CRUD, stats, cancel
│   │   ├── useChat.ts             # Interactive chat WebSocket
│   │   └── useNotificationBus.ts  # WebSocket notifications
│   └── layouts/
│       ├── default.vue
│       └── dashboard.vue          # Sidebar + content layout
├── server/
│   ├── api/
│   │   ├── fs/                    # File system operations
│   │   ├── tasks/                 # Task CRUD
│   │   ├── agents/                # Agent CRUD + runs
│   │   │   ├── index.get.ts
│   │   │   ├── index.post.ts
│   │   │   ├── stats.get.ts
│   │   │   └── [id]/
│   │   └── conversations/         # Chat conversation history
│   │       ├── index.get.ts       # List conversations
│   │       ├── [id].get.ts        # Get conversation + messages
│   │       └── [id].delete.ts     # Delete conversation
│   ├── routes/
│   │   ├── terminal.ts            # PTY WebSocket
│   │   ├── notifications.ts       # Notification WebSocket
│   │   └── _ws/
│   │       └── chat.ts            # Chat WebSocket (Agent SDK bridge)
│   ├── services/
│   │   ├── agent-executor.ts      # Claude SDK execution (cron agents)
│   │   └── cron-scheduler.ts      # Job management
│   ├── plugins/
│   │   ├── 01.database.ts         # DB init + auto-migrations (prod)
│   │   └── 03.cron-agents.ts      # Startup initialization
│   ├── db/
│   │   ├── schema.ts              # Drizzle schema
│   │   ├── migrate.ts             # Migration runner
│   │   ├── seed.ts                # Default data seeding
│   │   └── index.ts               # DB connection + warmup
│   └── utils/
│       ├── pty-manager.ts
│       ├── path-validator.ts
│       ├── notification-bus.ts    # Server event bus
│       ├── agent-registry.ts      # Running agent tracking
│       ├── agent-cleanup.ts       # Orphan cleanup
│       ├── chat-session-manager.ts # Active chat sessions (SDK)
│       └── db-state.ts            # DB availability flag
├── cli/
│   └── src/
│       ├── index.ts               # CLI entry point
│       └── commands/
│           ├── init.ts            # Install + setup
│           ├── update.ts          # Update + migrate + rebuild
│           ├── start.ts           # PM2 start
│           ├── stop.ts            # PM2 stop
│           ├── status.ts          # Health check
│           ├── logs.ts            # PM2 logs
│           └── reset.ts          # Sync Claude config
├── shared/
│   └── types/
│       └── index.ts               # Shared type definitions
└── nuxt.config.ts
```
