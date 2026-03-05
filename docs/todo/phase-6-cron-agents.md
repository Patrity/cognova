# Phase 6: Cron Agents

**Goal:** Users can schedule agents to run on a cron schedule with budget constraints and run history.

**Status:** Not started
**Depends on:** Phase 3, Phase 5

---

## Tasks

### 6.1 Cron Agent Configuration — API
- [ ] API: `server/api/agents/cron/index.get.ts` — list cron agents
- [ ] API: `server/api/agents/cron/index.post.ts` — create cron agent
- [ ] API: `server/api/agents/cron/[id].put.ts` — update cron agent
- [ ] API: `server/api/agents/cron/[id].delete.ts` — delete cron agent
- [ ] API: `server/api/agents/cron/[id]/runs.get.ts` — list runs for agent
- [ ] API: `server/api/agents/cron/[id]/cancel.post.ts` — cancel running agent

### 6.2 Agent Executor Service
- [ ] Create `server/services/agent-executor.ts`
  - `executeAgent(cronAgentId)`:
    - Create `cron_agent_runs` record (status=running)
    - Load agent via agent loader
    - Call `generateText()` (non-streaming, supports tool loop)
    - Track: tokens, cost, duration, turns
    - Enforce maxBudget: abort if accumulated cost exceeds limit
    - Enforce maxTurns: abort if tool loop iterations exceed limit
    - Update run record with result and final status
    - Log token usage
  - Agent registry: Map of active executions for cancellation
  - AbortController per execution

### 6.3 Cron Scheduler
- [ ] Install `node-cron`
- [ ] Create `server/services/cron-scheduler.ts`
  - Load all enabled cron agents from DB
  - Schedule each with node-cron
  - Handle add/remove/update without restart
  - Validate cron expressions
- [ ] Create `server/plugins/04.cron-agents.ts`
  - Start scheduler on boot
  - Graceful shutdown on process exit

### 6.4 Cron Agent UI
- [ ] Create `app/pages/agents/scheduled.vue`
- [ ] Cron agent list: name, agent, schedule (human-readable), enabled, last run status
- [ ] Create/edit form:
  - Name
  - Select agent (from installed agents)
  - Cron expression input with helper/preview (next 5 run times)
  - Prompt textarea
  - Max turns (number)
  - Max budget (number, in dollars)
  - Enabled toggle
- [ ] Run history per agent:
  - List: status badge, start time, duration, cost
  - Detail modal: full output, tool calls, token breakdown
- [ ] Cancel button for running agents
- [ ] Manual trigger button (run now)

### 6.5 Run Statuses
- [ ] `running` — currently executing
- [ ] `success` — completed normally
- [ ] `error` — failed with error
- [ ] `budget_exceeded` — stopped due to cost limit
- [ ] `cancelled` — manually cancelled

---

## Acceptance Criteria

1. User can create a scheduled agent with a cron expression
2. Agent runs automatically at scheduled time
3. Run history shows status, duration, cost
4. Budget constraint stops execution when exceeded
5. Turn constraint stops execution when exceeded
6. Running agent can be cancelled
7. Agent can be manually triggered (run now)
8. Cron schedule displays next run times
9. Enable/disable toggles scheduling without deleting
