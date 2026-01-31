---
tags: []
shared: false
---
# Claude Code Hooks Analytics

Track, analyze, and visualize hook events from Claude Code sessions. This feature provides real-time analytics for monitoring how hooks interact with Claude's tool usage.

## Overview

Claude Code supports hooks that run before and after tool executions. This feature captures those hook events, stores them in a database, and provides a dashboard for analysis. Use it to:

- Monitor which tools Claude uses most frequently
- Track block rates for security hooks
- Identify patterns in hook execution times
- Debug hook behavior across sessions

## Architecture

```
+------------------+     +-----------------+     +------------------+
|                  |     |                 |     |                  |
|  Hook Scripts    |---->|   POST /api/    |---->|   PostgreSQL     |
|  (.claude/hooks) |     |   hooks/events  |     |   (hookEvents)   |
|                  |     |                 |     |                  |
+------------------+     +-----------------+     +------------------+
                                                         |
                                                         v
+------------------+     +-----------------+     +------------------+
|                  |     |                 |     |                  |
|  Hooks Dashboard |<----|  GET /api/      |<----|   Stats &        |
|  (app/pages/     |     |  hooks/stats    |     |   Aggregation    |
|   hooks.vue)     |     |  hooks/events   |     |                  |
+------------------+     +-----------------+     +------------------+
```

### Data Flow

1. **Hook scripts** execute during Claude Code sessions
2. Scripts send event data to the **POST endpoint**
3. Events are stored in the **hookEvents table**
4. The **dashboard** fetches aggregated stats and recent events
5. **Charts and tables** visualize the data

## Database Schema

Events are stored in the `hook_events` table defined in `server/db/schema.ts`:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `eventType` | Enum | One of: `SessionStart`, `SessionEnd`, `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `UserPromptSubmit` |
| `sessionId` | Text | Claude session identifier |
| `projectDir` | Text | Directory where Claude is running |
| `toolName` | Text | Name of the tool being used (e.g., `Edit`, `Bash`) |
| `toolMatcher` | Text | Pattern that matched this hook (e.g., `Edit\|Write`) |
| `eventData` | JSON | Flexible storage for event-specific data |
| `exitCode` | Integer | Hook script exit code |
| `blocked` | Boolean | Whether the hook blocked the action |
| `blockReason` | Text | Explanation when blocked |
| `durationMs` | Integer | Hook execution time in milliseconds |
| `hookScript` | Text | Path to the hook script that ran |
| `createdAt` | Timestamp | When the event was recorded |

### Event Types

| Type | When It Fires |
|------|---------------|
| `SessionStart` | Claude Code session begins |
| `SessionEnd` | Claude Code session ends |
| `PreToolUse` | Before a tool executes (can block) |
| `PostToolUse` | After successful tool execution |
| `PostToolUseFailure` | After tool execution fails |
| `UserPromptSubmit` | When user submits a prompt |

## API Endpoints

### POST /api/hooks/events

Create a new hook event.

**Request Body:**

```typescript
interface CreateHookEventInput {
  eventType: HookEventType           // Required
  sessionId?: string
  projectDir?: string
  toolName?: string
  toolMatcher?: string
  eventData?: Record<string, unknown>
  exitCode?: number
  blocked?: boolean
  blockReason?: string
  durationMs?: number
  hookScript?: string
}
```

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/hooks/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "PreToolUse",
    "sessionId": "abc123",
    "toolName": "Edit",
    "blocked": true,
    "blockReason": "Cannot edit .env files"
  }'
```

**Response:**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "eventType": "PreToolUse",
    "sessionId": "abc123",
    "toolName": "Edit",
    "blocked": true,
    "blockReason": "Cannot edit .env files",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### GET /api/hooks/events

Retrieve hook events with optional filtering.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `eventType` | string/array | Filter by event type(s) |
| `sessionId` | string | Filter by session |
| `toolName` | string | Filter by tool name |
| `blocked` | boolean | Filter blocked events |
| `since` | ISO date | Events after this date |
| `limit` | number | Max results (default: 100, max: 500) |

**Example Request:**

```bash
# Get recent Edit tool events
curl "http://localhost:3000/api/hooks/events?toolName=Edit&limit=50"

# Get blocked events in last 24 hours
curl "http://localhost:3000/api/hooks/events?blocked=true&since=2024-01-14T00:00:00Z"
```

**Response:**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "eventType": "PreToolUse",
      "sessionId": "abc123",
      "toolName": "Edit",
      "blocked": true,
      "blockReason": "Cannot edit .env files",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### GET /api/hooks/stats

Get aggregated statistics for hook events.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `period` | string | Time period: `24h`, `7d`, or `30d` (default: `7d`) |

**Example Request:**

```bash
curl "http://localhost:3000/api/hooks/stats?period=7d"
```

**Response:**

```json
{
  "data": {
    "totalEvents": 1234,
    "blockedEvents": 23,
    "blockRate": 2,
    "avgDurationMs": 45,
    "eventsByType": {
      "PreToolUse": 500,
      "PostToolUse": 480,
      "SessionStart": 127,
      "SessionEnd": 127
    },
    "toolBreakdown": [
      {
        "toolName": "Edit",
        "total": 350,
        "blocked": 12,
        "avgDurationMs": 38
      },
      {
        "toolName": "Bash",
        "total": 280,
        "blocked": 8,
        "avgDurationMs": 52
      }
    ],
    "dailyActivity": [
      {
        "date": "2024-01-09",
        "total": 180,
        "blocked": 3,
        "allowed": 177,
        "avgDurationMs": 42
      }
    ],
    "recentSessions": [
      "session-abc123",
      "session-def456"
    ]
  }
}
```

## Frontend Components

### Hooks Dashboard Page

**File:** `app/pages/hooks.vue`

The main dashboard page that composes all hook analytics components. Features:

- Period selector (24h, 7d, 30d)
- Auto-refresh on period change
- Persists period preference

```vue
<template>
  <HooksHookStatsCards :stats="stats" :loading="loading" />
  <HooksHookActivityChart :data="stats.dailyActivity" title="Daily Activity" />
  <HooksToolBreakdownTable :data="stats.toolBreakdown" />
  <HooksRecentEventsTable :events="events" />
</template>
```

### HookStatsCards

**File:** `app/components/hooks/HookStatsCards.vue`

Displays summary statistics in a card grid.

| Prop | Type | Description |
|------|------|-------------|
| `stats` | `HookEventStats \| null` | Statistics data |
| `loading` | `boolean` | Show skeleton loaders |

**Cards Displayed:**

- Total Events
- Blocked Count
- Block Rate (%)
- Average Duration
- Session Count

### HookActivityChart

**File:** `app/components/hooks/HookActivityChart.client.vue`

A stacked bar chart showing daily activity (allowed vs blocked).

| Prop | Type | Description |
|------|------|-------------|
| `data` | `HookDailyData[]` | Daily activity data |
| `title` | `string` | Chart title |
| `height` | `string` | CSS height class |

Uses the `@unovis/vue` charting library with:

- Stacked bars (green = allowed, red = blocked)
- Crosshair tooltip with date and counts
- Responsive width

**Note:** Has a `.server.vue` counterpart that shows a skeleton during SSR.

### RecentEventsTable

**File:** `app/components/hooks/RecentEventsTable.vue`

A table showing recent hook events with color-coded badges.

| Prop | Type | Description |
|------|------|-------------|
| `events` | `HookEvent[]` | Event data |
| `loading` | `boolean` | Show skeleton loaders |

**Columns:**

- Event Type (with colored badge)
- Tool Name
- Status (Allowed/Blocked badge)
- Duration (ms)
- Time (relative)

### ToolBreakdownTable

**File:** `app/components/hooks/ToolBreakdownTable.vue`

Shows tool usage breakdown sorted by frequency.

| Prop | Type | Description |
|------|------|-------------|
| `data` | `HookToolBreakdown[]` | Tool breakdown data |
| `loading` | `boolean` | Show skeleton loaders |

**Columns:**

- Tool Name
- Total Uses
- Blocked Count (color-coded by rate)
- Average Duration

### Composable: useHookEvents

**File:** `app/composables/useHookEvents.ts`

Provides reactive state and fetch functions for hook data.

```typescript
const {
  events,           // ref<HookEvent[]>
  stats,            // ref<HookEventStats | null>
  loading,          // ref<boolean>
  error,            // ref<string | null>
  fetchEvents,      // (filters?: HookEventFilters) => Promise<HookEvent[]>
  fetchStats,       // (period?: StatsPeriod) => Promise<HookEventStats>
  fetchEventsBySession // (sessionId: string, limit?: number) => Promise<HookEvent[]>
} = useHookEvents()
```

## Hook Scripts

Hook scripts live in `.claude/hooks/` and are configured in `.claude/settings.json`.

### protect-env.sh

**Purpose:** Blocks edits to sensitive files containing secrets.

**Trigger:** `PreToolUse` on `Edit` or `Write` tools

**Location:** `.claude/hooks/protect-env.sh`

```bash
#!/bin/bash
# Pre-edit hook: Block edits to sensitive files

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

BASENAME=$(basename "$FILE_PATH")
case "$BASENAME" in
  .env|.env.local|.env.production|credentials.json|secrets.*)
    echo "Cannot edit sensitive file: $BASENAME" >&2
    exit 2  # Exit 2 = block with message
    ;;
esac

exit 0  # Exit 0 = allow
```

### lint-check.sh

**Purpose:** Runs lint after file edits to catch issues early.

**Trigger:** `PostToolUse` on `Edit` or `Write` tools

**Location:** `.claude/hooks/lint-check.sh`

```bash
#!/bin/bash
# Post-edit hook: Run lint on modified files

cd "$CLAUDE_PROJECT_DIR" || exit 1

if ! pnpm lint --quiet 2>/dev/null; then
  echo "Lint errors found. Please fix them before continuing." >&2
  exit 2
fi

exit 0
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success / Allow |
| 2 | Block with message to Claude |
| Other | Error (action allowed but logged) |

## Configuration

Hooks are configured in `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/protect-env.sh",
            "timeout": 5
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/lint-check.sh",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

### Configuration Options

| Field | Type | Description |
|-------|------|-------------|
| `matcher` | string | Regex pattern to match tool names |
| `type` | string | Hook type (currently only `command`) |
| `command` | string | Shell command to execute |
| `timeout` | number | Max execution time in seconds |

### Environment Variables

Hooks receive these environment variables:

| Variable | Description |
|----------|-------------|
| `CLAUDE_PROJECT_DIR` | Current project directory |
| `CLAUDE_SESSION_ID` | Current session identifier |

## TypeScript Types

All types are defined in `shared/types/index.ts`:

```typescript
// Event types
type HookEventType =
  | 'SessionStart'
  | 'SessionEnd'
  | 'PreToolUse'
  | 'PostToolUse'
  | 'PostToolUseFailure'
  | 'UserPromptSubmit'

// Main event interface
interface HookEvent {
  id: string
  eventType: HookEventType
  sessionId?: string
  projectDir?: string
  toolName?: string
  toolMatcher?: string
  eventData?: Record<string, unknown>
  exitCode?: number
  blocked: boolean
  blockReason?: string
  durationMs?: number
  hookScript?: string
  createdAt: Date
}

// Input for creating events
interface CreateHookEventInput {
  eventType: HookEventType
  sessionId?: string
  projectDir?: string
  toolName?: string
  toolMatcher?: string
  eventData?: Record<string, unknown>
  exitCode?: number
  blocked?: boolean
  blockReason?: string
  durationMs?: number
  hookScript?: string
}

// Query filters
interface HookEventFilters {
  eventType?: HookEventType | HookEventType[]
  sessionId?: string
  toolName?: string
  blocked?: boolean
  since?: string
  limit?: number
}

// Analytics types
interface HookDailyData {
  date: string
  total: number
  blocked: number
  allowed: number
  avgDurationMs: number
}

interface HookToolBreakdown {
  toolName: string
  total: number
  blocked: number
  avgDurationMs: number
}

interface HookEventStats {
  totalEvents: number
  blockedEvents: number
  blockRate: number
  avgDurationMs: number
  eventsByType: Partial<Record<HookEventType, number>>
  toolBreakdown: HookToolBreakdown[]
  dailyActivity: HookDailyData[]
  recentSessions: string[]
}
```

## Usage Examples

### Sending Events from a Hook Script

Add analytics to your hook scripts by posting events:

```bash
#!/bin/bash
# Example hook with analytics

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
START_TIME=$(date +%s%N)

# Your hook logic here
RESULT="allowed"
EXIT_CODE=0

# Calculate duration
END_TIME=$(date +%s%N)
DURATION_MS=$(( ($END_TIME - $START_TIME) / 1000000 ))

# Send analytics (fire and forget)
curl -s -X POST "http://localhost:3000/api/hooks/events" \
  -H "Content-Type: application/json" \
  -d "{
    \"eventType\": \"PreToolUse\",
    \"toolName\": \"$TOOL_NAME\",
    \"durationMs\": $DURATION_MS,
    \"blocked\": false,
    \"hookScript\": \"$0\"
  }" &

exit $EXIT_CODE
```

### Querying Events Programmatically

```typescript
// In a Nuxt composable or page
const { fetchEvents, fetchStats } = useHookEvents()

// Get recent blocked events
const blockedEvents = await fetchEvents({
  blocked: true,
  limit: 20
})

// Get 30-day statistics
const monthlyStats = await fetchStats('30d')

// Get events for a specific session
const sessionEvents = await fetchEventsBySession('session-abc123')
```

### Adding a New Hook

1. Create the hook script in `.claude/hooks/`:

```bash
#!/bin/bash
# .claude/hooks/my-custom-hook.sh

# Your validation logic
if some_condition; then
  echo "Blocked: reason" >&2
  exit 2
fi

exit 0
```

2. Make it executable:

```bash
chmod +x .claude/hooks/my-custom-hook.sh
```

3. Register in `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "ToolName",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/my-custom-hook.sh",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

## Security Considerations

1. **Authentication:** All API endpoints require database access (enforced by `requireDb`)
2. **Rate Limiting:** Consider adding rate limiting for high-traffic deployments
3. **Data Retention:** Implement cleanup for old events to manage database size
4. **Sensitive Data:** Avoid logging sensitive information in `eventData`

## File Reference

| Path | Description |
|------|-------------|
| `server/db/schema.ts` | Database schema (hookEvents table) |
| `server/api/hooks/events/index.post.ts` | Create event endpoint |
| `server/api/hooks/events/index.get.ts` | List events endpoint |
| `server/api/hooks/stats.get.ts` | Statistics endpoint |
| `app/pages/hooks.vue` | Dashboard page |
| `app/composables/useHookEvents.ts` | Data fetching composable |
| `app/components/hooks/HookStatsCards.vue` | Summary cards |
| `app/components/hooks/HookActivityChart.client.vue` | Activity chart |
| `app/components/hooks/RecentEventsTable.vue` | Events table |
| `app/components/hooks/ToolBreakdownTable.vue` | Tool usage table |
| `.claude/hooks/protect-env.sh` | Environment file protection |
| `.claude/hooks/lint-check.sh` | Post-edit linting |
| `.claude/settings.json` | Hook configuration |
| `shared/types/index.ts` | TypeScript type definitions |
