import { CronJob } from 'cron'
import { eq } from 'drizzle-orm'
import { getDb } from '../db'
import * as schema from '../db/schema'
import { executeAgent } from './agent-executor'

const jobs = new Map<string, CronJob>()

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
  const job = jobs.get(agentId)
  if (job) {
    job.stop()
    jobs.delete(agentId)
  }
}

export function getScheduledAgentIds(): string[] {
  return Array.from(jobs.keys())
}
