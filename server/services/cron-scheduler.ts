import { CronJob } from 'cron'
import { eq } from 'drizzle-orm'
import { getDb } from '../db'
import * as schema from '../db/schema'
import { executeAgent } from './agent-executor'

// Use globalThis to ensure the same Map instance across Nitro module boundaries
// This prevents issues where the plugin and API handlers get different module instances
const JOBS_KEY = '__secondBrain_cronJobs__' as const
declare global {
  // eslint-disable-next-line no-var
  var __secondBrain_cronJobs__: Map<string, CronJob> | undefined
}

function getJobs(): Map<string, CronJob> {
  if (!globalThis[JOBS_KEY])
    globalThis[JOBS_KEY] = new Map<string, CronJob>()
  return globalThis[JOBS_KEY]
}

export async function initCronScheduler(): Promise<number> {
  const db = getDb()
  const agents = await db.query.cronAgents.findMany({
    where: eq(schema.cronAgents.enabled, true)
  })

  for (const agent of agents) {
    scheduleAgent(agent)
  }

  return agents.length
}

export function scheduleAgent(agent: typeof schema.cronAgents.$inferSelect) {
  unscheduleAgent(agent.id)

  if (!agent.enabled) return

  const jobs = getJobs()

  try {
    const job = new CronJob(
      agent.schedule,
      () => {
        console.log(`[cron] Triggering agent: ${agent.name}`)
        executeAgent({
          id: agent.id,
          name: agent.name,
          prompt: agent.prompt,
          maxTurns: agent.maxTurns ?? 50,
          maxBudgetUsd: agent.maxBudgetUsd ?? undefined
        }).catch(err => console.error(`[cron] Agent ${agent.name} error:`, err))
      },
      null,
      true,
      'UTC'
    )

    jobs.set(agent.id, job)
    console.log(`[cron] Scheduled: ${agent.name} (${agent.schedule})`)
  } catch {
    console.error(`[cron] Invalid schedule for ${agent.name}: ${agent.schedule}`)
  }
}

export function unscheduleAgent(agentId: string) {
  const jobs = getJobs()
  const job = jobs.get(agentId)
  if (job) {
    job.stop()
    jobs.delete(agentId)
    console.log(`[cron] Unscheduled agent: ${agentId}`)
  }
}

export function getScheduledAgentIds(): string[] {
  return Array.from(getJobs().keys())
}
