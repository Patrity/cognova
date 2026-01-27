# Cron Agents

Scheduled Claude Code agents that run automated tasks on a schedule.

## Overview

Enable scheduled execution of Claude Code for automated workflows:
- Email scanning and summarization
- Daily task review and prioritization
- Periodic vault organization
- External API monitoring
- Automated content generation

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Cron Schedule                         │
│  - Daily at 8am: email digest                            │
│  - Every 6 hours: task review                            │
│  - Weekly: vault cleanup                                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                 Agent Executor                           │
│  1. Spawn Claude Code process                            │
│  2. Load agent prompt from config                        │
│  3. Execute with timeout                                 │
│  4. Capture output                                       │
│  5. Send notification on completion/error                │
└────────────────────┬────────────────────────────────────┘
                     │
           ┌─────────┴─────────┐
           ▼                   ▼
┌─────────────────┐   ┌─────────────────┐
│   Claude Code   │   │   Results DB    │
│   CLI Process   │   │   + Gotify      │
└─────────────────┘   └─────────────────┘
```

## Schema

```typescript
// server/db/schema.ts
export const cronAgents = pgTable('cron_agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  schedule: text('schedule').notNull(),  // Cron expression
  prompt: text('prompt').notNull(),       // Agent instructions
  enabled: boolean('enabled').default(true),
  timeout: integer('timeout').default(300),  // Seconds
  lastRun: timestamp('last_run', { withTimezone: true }),
  lastStatus: text('last_status', { enum: ['success', 'error', 'timeout'] }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

export const cronAgentRuns = pgTable('cron_agent_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => cronAgents.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['running', 'success', 'error', 'timeout'] }).notNull(),
  output: text('output'),
  error: text('error'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  durationMs: integer('duration_ms')
})
```

## Agent Executor

```typescript
// server/services/agent-executor.ts
import { spawn } from 'child_process'
import { db, schema } from '../db'
import { sendGotifyNotification } from './gotify'

interface AgentConfig {
  id: string
  name: string
  prompt: string
  timeout: number
}

export async function executeAgent(config: AgentConfig): Promise<void> {
  const startTime = Date.now()

  // Create run record
  const [run] = await db.insert(schema.cronAgentRuns)
    .values({
      agentId: config.id,
      status: 'running'
    })
    .returning()

  try {
    const output = await runClaudeCode(config.prompt, config.timeout)

    // Update run as success
    await db.update(schema.cronAgentRuns)
      .set({
        status: 'success',
        output,
        completedAt: new Date(),
        durationMs: Date.now() - startTime
      })
      .where(eq(schema.cronAgentRuns.id, run.id))

    // Update agent last run
    await db.update(schema.cronAgents)
      .set({
        lastRun: new Date(),
        lastStatus: 'success'
      })
      .where(eq(schema.cronAgents.id, config.id))

    // Notify on completion
    await sendGotifyNotification({
      title: `Agent Complete: ${config.name}`,
      message: output.slice(0, 200),
      priority: 3
    })

  } catch (error) {
    const isTimeout = error.message?.includes('timeout')

    // Update run as error
    await db.update(schema.cronAgentRuns)
      .set({
        status: isTimeout ? 'timeout' : 'error',
        error: error.message,
        completedAt: new Date(),
        durationMs: Date.now() - startTime
      })
      .where(eq(schema.cronAgentRuns.id, run.id))

    // Update agent last run
    await db.update(schema.cronAgents)
      .set({
        lastRun: new Date(),
        lastStatus: isTimeout ? 'timeout' : 'error'
      })
      .where(eq(schema.cronAgents.id, config.id))

    // Notify on error
    await sendGotifyNotification({
      title: `Agent Failed: ${config.name}`,
      message: error.message,
      priority: 8
    })
  }
}

async function runClaudeCode(prompt: string, timeout: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = []

    const proc = spawn('claude', ['--print', '--dangerously-skip-permissions'], {
      env: { ...process.env },
      timeout: timeout * 1000
    })

    // Send prompt to stdin
    proc.stdin.write(prompt)
    proc.stdin.end()

    proc.stdout.on('data', (data) => {
      chunks.push(data.toString())
    })

    proc.stderr.on('data', (data) => {
      console.error('Claude stderr:', data.toString())
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(chunks.join(''))
      } else {
        reject(new Error(`Claude exited with code ${code}`))
      }
    })

    proc.on('error', (err) => {
      reject(err)
    })

    // Handle timeout
    setTimeout(() => {
      proc.kill('SIGTERM')
      reject(new Error(`Agent timeout after ${timeout}s`))
    }, timeout * 1000)
  })
}
```

## Cron Scheduler

```typescript
// server/services/cron-scheduler.ts
import { CronJob } from 'cron'
import { db, schema } from '../db'
import { executeAgent } from './agent-executor'

const jobs = new Map<string, CronJob>()

export async function initCronScheduler() {
  const agents = await db.select()
    .from(schema.cronAgents)
    .where(eq(schema.cronAgents.enabled, true))

  for (const agent of agents) {
    scheduleAgent(agent)
  }

  console.log(`Scheduled ${agents.length} cron agents`)
}

export function scheduleAgent(agent: typeof schema.cronAgents.$inferSelect) {
  // Remove existing job if any
  const existing = jobs.get(agent.id)
  if (existing) {
    existing.stop()
  }

  const job = new CronJob(
    agent.schedule,
    () => executeAgent({
      id: agent.id,
      name: agent.name,
      prompt: agent.prompt,
      timeout: agent.timeout
    }),
    null,
    true,  // Start immediately
    'UTC'
  )

  jobs.set(agent.id, job)
}

export function unscheduleAgent(agentId: string) {
  const job = jobs.get(agentId)
  if (job) {
    job.stop()
    jobs.delete(agentId)
  }
}
```

## Example Agents

### Email Digest Agent

```typescript
const emailDigestAgent = {
  name: 'Email Digest',
  schedule: '0 8 * * *',  // Daily at 8am
  prompt: `
You are an email scanning agent for Second Brain.

Tasks:
1. Check the Gmail API for new emails since last run
2. Summarize important emails
3. Create tasks for action items
4. Send a digest notification

Use the available skills:
- /gmail-fetch to get emails
- /task to create tasks
- /notify to send the digest

Focus on emails that require action. Ignore newsletters and promotions.
`,
  timeout: 300
}
```

### Task Review Agent

```typescript
const taskReviewAgent = {
  name: 'Task Review',
  schedule: '0 */6 * * *',  // Every 6 hours
  prompt: `
You are a task management agent for Second Brain.

Tasks:
1. Review all open tasks
2. Identify overdue tasks
3. Suggest priority adjustments
4. Send a summary notification

Use the available skills:
- /tasks to list tasks
- /task-update to adjust priorities
- /notify for the summary

Be concise. Focus on what needs attention.
`,
  timeout: 120
}
```

### Vault Cleanup Agent

```typescript
const vaultCleanupAgent = {
  name: 'Vault Cleanup',
  schedule: '0 0 * * 0',  // Weekly on Sunday midnight
  prompt: `
You are a vault organization agent for Second Brain.

Tasks:
1. Find files in /inbox older than 7 days
2. Suggest where to move them based on content
3. Identify duplicate or similar files
4. Report findings (don't move automatically)

Use the available skills:
- /vault-list to browse
- /vault-read to check content
- /notify for the report

Be thorough but don't make changes without confirmation.
`,
  timeout: 600
}
```

## API Endpoints

### List Agents

```typescript
// server/api/agents/index.get.ts
export default defineEventHandler(async () => {
  const agents = await db.select()
    .from(schema.cronAgents)
    .orderBy(schema.cronAgents.name)

  return { agents }
})
```

### Create Agent

```typescript
// server/api/agents/index.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const [agent] = await db.insert(schema.cronAgents)
    .values({
      name: body.name,
      description: body.description,
      schedule: body.schedule,
      prompt: body.prompt,
      timeout: body.timeout || 300,
      enabled: body.enabled ?? true
    })
    .returning()

  // Schedule if enabled
  if (agent.enabled) {
    scheduleAgent(agent)
  }

  return { agent }
})
```

### Run Agent Manually

```typescript
// server/api/agents/[id]/run.post.ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  const [agent] = await db.select()
    .from(schema.cronAgents)
    .where(eq(schema.cronAgents.id, id))

  if (!agent) {
    throw createError({ statusCode: 404 })
  }

  // Execute asynchronously
  executeAgent({
    id: agent.id,
    name: agent.name,
    prompt: agent.prompt,
    timeout: agent.timeout
  }).catch(console.error)

  return { message: 'Agent started' }
})
```

### Get Agent Runs

```typescript
// server/api/agents/[id]/runs.get.ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  const runs = await db.select()
    .from(schema.cronAgentRuns)
    .where(eq(schema.cronAgentRuns.agentId, id))
    .orderBy(desc(schema.cronAgentRuns.startedAt))
    .limit(20)

  return { runs }
})
```

## UI: Agents Page

```vue
<!-- app/pages/agents.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const { data: agents, refresh } = await useFetch('/api/agents')

async function runAgent(id: string) {
  await $fetch(`/api/agents/${id}/run`, { method: 'POST' })
  refresh()
}

async function toggleAgent(id: string, enabled: boolean) {
  await $fetch(`/api/agents/${id}`, {
    method: 'PATCH',
    body: { enabled }
  })
  refresh()
}
</script>

<template>
  <UDashboardPanel grow>
    <template #header>
      <UDashboardNavbar title="Scheduled Agents">
        <template #right>
          <UButton icon="i-lucide-plus" label="New Agent" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #default>
      <div class="p-4 space-y-4">
        <UCard v-for="agent in agents" :key="agent.id">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-medium">{{ agent.name }}</h3>
              <p class="text-sm text-dimmed">{{ agent.schedule }}</p>
            </div>
            <div class="flex gap-2">
              <USwitch
                :model-value="agent.enabled"
                @update:model-value="toggleAgent(agent.id, $event)"
              />
              <UButton
                icon="i-lucide-play"
                variant="ghost"
                @click="runAgent(agent.id)"
              />
            </div>
          </div>
          <div v-if="agent.lastRun" class="mt-2 text-sm text-dimmed">
            Last run: {{ formatDate(agent.lastRun) }}
            <UBadge
              :color="agent.lastStatus === 'success' ? 'success' : 'error'"
            >
              {{ agent.lastStatus }}
            </UBadge>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
```

## Dependencies

```bash
pnpm add cron
pnpm add -D @types/cron
```

## Implementation Steps

1. [ ] Install cron dependency
2. [ ] Add schema for agents and runs
3. [ ] Generate migration
4. [ ] Create agent executor service
5. [ ] Create cron scheduler service
6. [ ] Add API endpoints
7. [ ] Build agents management page
8. [ ] Create example agents
9. [ ] Add Nitro plugin for startup
10. [ ] Test with simple agent
11. [ ] Add manual run button

## Dependencies

- Requires: database-init, skills-system
- Blocks: None
- Related: notifications (agents send notifications), task-skill (agents create tasks)
