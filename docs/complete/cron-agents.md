---
tags: []
shared: false
---
# Cron Agents (Implemented)

Scheduled Claude Code agents that run automated tasks on a schedule using the Claude Agent SDK.

## Overview

Enable scheduled execution of Claude Code for automated workflows:
- Email scanning and summarization
- Daily task review and prioritization
- Periodic vault organization
- External API monitoring
- Automated content generation

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Cron Schedule                              │
│  Uses 'cron' package, managed by cron-scheduler service          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Agent Executor                              │
│  1. Create run record in DB                                      │
│  2. Register in AgentRegistry (for cancellation)                 │
│  3. Broadcast 'agent:started' via WebSocket                      │
│  4. Execute via Claude Agent SDK query()                         │
│  5. Check for cancellation between stream messages               │
│  6. Record metrics (cost, tokens, duration)                      │
│  7. Broadcast 'agent:completed' or 'agent:failed'                │
│  8. Unregister from AgentRegistry                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
│  Claude Agent    │ │  Postgres    │ │  WebSocket       │
│  SDK             │ │  (Neon)      │ │  Notification    │
│                  │ │              │ │  Bus             │
│  query() with    │ │  Agents,     │ │                  │
│  streaming       │ │  Runs,       │ │  Real-time UI    │
│                  │ │  Metrics     │ │  updates         │
└──────────────────┘ └──────────────┘ └──────────────────┘
```

## Key Implementation Differences from Plan

| Planned | Implemented | Reason |
|---------|-------------|--------|
| CLI subprocess spawn | Claude Agent SDK `query()` | SDK provides better streaming, cancellation, and metrics |
| `timeout` field | `maxTurns` + `maxBudgetUsd` | SDK uses turns/budget instead of time-based timeout |
| `timeout` status | `budget_exceeded` + `cancelled` | More granular status tracking |
| Gotify notifications | WebSocket notification bus | Real-time UI updates; Gotify integration TODO |
| Simple output capture | Full metrics (cost, tokens, turns) | SDK provides comprehensive usage data |

## Schema (Actual)

```typescript
// server/db/schema.ts
export const cronAgents = pgTable('cron_agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  schedule: text('schedule').notNull(),      // Cron expression
  prompt: text('prompt').notNull(),           // Agent instructions
  enabled: boolean('enabled').default(true),
  maxTurns: integer('max_turns').default(50), // SDK turn limit
  maxBudgetUsd: real('max_budget_usd'),       // SDK cost limit (optional)
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  lastStatus: text('last_status', {
    enum: ['success', 'error', 'budget_exceeded', 'cancelled']
  }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' })
})

export const cronAgentRuns = pgTable('cron_agent_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').notNull()
    .references(() => cronAgents.id, { onDelete: 'cascade' }),
  status: text('status', {
    enum: ['running', 'success', 'error', 'budget_exceeded', 'cancelled']
  }).notNull(),
  output: text('output'),
  error: text('error'),
  costUsd: real('cost_usd'),                   // Actual run cost
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  numTurns: integer('num_turns'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  durationMs: integer('duration_ms')
})
```

## Services

### Agent Executor (`server/services/agent-executor.ts`)

Uses Claude Agent SDK instead of CLI subprocess:

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk'

async function runAgentSDK(config: AgentConfig, runId: string): Promise<AgentResult> {
  const conversation = query({
    prompt: config.prompt,
    options: {
      cwd: process.env.VAULT_PATH || process.cwd(),
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: config.maxTurns ?? 50,
      maxBudgetUsd: config.maxBudgetUsd ?? undefined
    }
  })

  for await (const message of conversation) {
    // Check for cancellation between messages
    if (agentRegistry.isCancelled(runId)) {
      throw new AgentCancelledError()
    }

    if (message.type === 'result') {
      return extractResult(message)
    }
  }
}
```

Key features:
- Streaming execution with cancellation checkpoints
- Cost and token tracking from SDK
- Custom `AgentCancelledError` for graceful cancellation
- Integration with notification bus for real-time updates

### Agent Registry (`server/utils/agent-registry.ts`)

Tracks running agents for cancellation support:

```typescript
class AgentRegistry {
  private runningAgents = new Map<string, RunningAgent>()

  register(runId: string, agentId: string, agentName: string): void
  unregister(runId: string): void
  isCancelled(runId: string): boolean
  cancelByAgentId(agentId: string): number  // Returns count cancelled
  isAgentRunning(agentId: string): boolean
  getRunningAgentIds(): string[]
}
```

### Agent Cleanup (`server/utils/agent-cleanup.ts`)

Cleans up orphaned runs on server startup:

```typescript
export async function cleanupOrphanedRuns(): Promise<{ cancelled: number, fixed: number }>
```

Handles:
1. Runs with `status='running'` from server shutdown mid-execution
2. Terminal runs missing `completedAt` timestamp

### Cron Scheduler (`server/services/cron-scheduler.ts`)

Manages scheduled execution:

```typescript
export async function initCronScheduler(): Promise<number>  // Returns count
export function scheduleAgent(agent: CronAgent): void
export function unscheduleAgent(agentId: string): void
export function rescheduleAgent(agent: CronAgent): void
```

Initialized via Nitro plugin at startup.

## WebSocket Notification Bus

Real-time notification system for agent status updates.

### Server Components

**Notification Bus** (`server/utils/notification-bus.ts`):
```typescript
class NotificationBus extends EventEmitter {
  registerPeer(peer: Peer): void
  unregisterPeer(peerId: string): void
  broadcast(payload: NotificationPayload): void
}
```

**WebSocket Route** (`server/routes/notifications.ts`):
- Uses Nitro's `defineWebSocketHandler` with `crossws`
- Handles ping/pong for keep-alive
- Registers/unregisters peers with notification bus

### Client Composable

**`useNotificationBus`** (`app/composables/useNotificationBus.ts`):

```typescript
export function useNotificationBus() {
  return {
    status: readonly(status),           // 'disconnected' | 'connecting' | 'connected' | 'error'
    runningAgentIds: readonly(runningAgentIds),
    isAgentRunning,                     // (agentId: string) => boolean
    connect,
    disconnect
  }
}
```

Features:
- Auto-reconnection with exponential backoff
- Ping interval for keep-alive (30s)
- Integration with `useToast()` for automatic notifications
- Shared state across component instances

### Notification Types

```typescript
export type NotificationType
  = 'agent:started'
  | 'agent:completed'
  | 'agent:failed'
  | 'toast'

export interface NotificationPayload {
  type: NotificationType
  agentId?: string
  agentName?: string
  runId?: string
  status?: string
  message?: string
  title?: string
  color?: 'success' | 'error' | 'warning' | 'info'
  timestamp?: string
}
```

## API Endpoints

### Agent Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agents` | GET | List all agents with creator |
| `/api/agents` | POST | Create new agent |
| `/api/agents/[id]` | GET | Get single agent |
| `/api/agents/[id]` | PUT | Update agent |
| `/api/agents/[id]` | DELETE | Delete agent |
| `/api/agents/[id]/toggle` | POST | Toggle enabled status |
| `/api/agents/[id]/run` | POST | Manual trigger |
| `/api/agents/[id]/cancel` | POST | Cancel running execution |

### Statistics

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agents/stats` | GET | Global stats (period filter) |
| `/api/agents/[id]/stats` | GET | Agent-specific stats |
| `/api/agents/[id]/runs` | GET | Run history (period + limit) |

Query params:
- `period`: `'24h' | '7d' | '30d'` (default: `'7d'`)
- `limit`: number (default: 100)

### Stats Response Types

```typescript
export interface AgentGlobalStats {
  totalAgents: number
  activeAgents: number
  runsInPeriod: number
  successRate: number
  totalCostUsd: number
  runningAgentIds: string[]
  dailyRuns: DailyRunData[]
}

export interface AgentDetailStats {
  totalRuns: number
  successRate: number
  avgDurationMs: number
  totalCostUsd: number
  lastRunAt: string | null
  dailyRuns: DailyRunData[]
}

export interface DailyRunData {
  date: string
  success: number
  error: number      // Includes budget_exceeded and cancelled
  total: number
  costUsd: number
}
```

## UI Components

### Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/agents` | `pages/agents/index.vue` | Dashboard with stats, chart, agent cards |
| `/agents/[id]` | `pages/agents/[id].vue` | Detail page with stats, history, controls |

### Components

| Component | Description |
|-----------|-------------|
| `AgentStatsCards.vue` | KPI cards (global or detail variant) |
| `AgentActivityChart.client.vue` | Unovis line/area chart |
| `AgentActivityChart.server.vue` | SSR skeleton placeholder |
| `AgentRunModal.vue` | Full run output/error modal |
| `AgentForm.vue` | Create/edit agent form |

### UI Features

- **Period selector**: Toggle between 24h/7d/30d views
- **Running indicator**: Badge + animated icon when agent is executing
- **Cancel button**: Stop icon replaces play when running
- **Clickable cards**: Navigate to detail page
- **Run history**: Click to view full output in modal

### Charts

Uses Unovis (`@unovis/ts`, `@unovis/vue`):

```typescript
import { VisXYContainer, VisLine, VisArea, VisAxis, VisCrosshair, VisTooltip } from '@unovis/vue'
```

Chart shows daily run activity with:
- Line for total runs
- Area fill for visual appeal
- Crosshair tooltip with success/error/cost breakdown

## Dependencies

```json
{
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "^0.0.3",
    "@unovis/ts": "^1.4.5",
    "@unovis/vue": "^1.4.5",
    "cron": "^3.1.7"
  },
  "devDependencies": {
    "@types/cron": "^2.0.1"
  }
}
```

## Docker Considerations

Claude settings persistence added to `docker-compose.yml`:

```yaml
volumes:
  - claude_settings:/home/node/.claude
```

Entrypoint script initializes settings volume on first run.

## Implementation Status

- [x] Schema for agents and runs
- [x] Agent executor with Claude SDK
- [x] Cron scheduler service
- [x] WebSocket notification bus
- [x] API endpoints (CRUD, stats, cancel)
- [x] Agent registry for cancellation
- [x] Orphaned run cleanup on startup
- [x] Dashboard page with stats/chart
- [x] Detail page with history
- [x] Real-time running indicators
- [x] Period-filtered statistics
- [ ] Gotify push notifications (TODO in executor)
- [ ] Example pre-configured agents

## Related

- **Depends on**: database-init, auth
- **Integrates with**: WebSocket notification bus (reusable for future features)
- **Future**: Gotify notifications, agent templates, scheduled pause/resume
