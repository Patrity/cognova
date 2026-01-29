import { eq, and, isNull } from 'drizzle-orm'
import { getDb, schema } from '../db'

/**
 * Cleans up orphaned agent runs on server startup.
 *
 * Scenarios handled:
 * 1. Runs with status='running' - server shutdown mid-execution
 * 2. Terminal runs (success/error/budget_exceeded) missing completedAt timestamp
 */
export async function cleanupOrphanedRuns(): Promise<{ cancelled: number, fixed: number }> {
  const db = getDb()

  let cancelled = 0
  let fixed = 0

  // 1. Cancel all currently 'running' runs (server must have shut down mid-run)
  const runningRuns = await db
    .update(schema.cronAgentRuns)
    .set({
      status: 'cancelled',
      error: 'Server shutdown during execution',
      completedAt: new Date(),
      durationMs: null // We don't know the actual duration
    })
    .where(eq(schema.cronAgentRuns.status, 'running'))
    .returning({ id: schema.cronAgentRuns.id, agentId: schema.cronAgentRuns.agentId })

  cancelled = runningRuns.length

  // 2. For each cancelled run, update the agent's lastStatus if this was their latest run
  for (const run of runningRuns) {
    // Check if this was the agent's most recent run
    const latestRun = await db.query.cronAgentRuns.findFirst({
      where: eq(schema.cronAgentRuns.agentId, run.agentId),
      orderBy: (runs, { desc }) => [desc(runs.startedAt)]
    })

    if (latestRun && latestRun.id === run.id) {
      await db
        .update(schema.cronAgents)
        .set({ lastStatus: 'cancelled' })
        .where(eq(schema.cronAgents.id, run.agentId))
    }
  }

  // 3. Fix terminal runs missing completedAt timestamp
  const fixedRuns = await db
    .update(schema.cronAgentRuns)
    .set({
      completedAt: new Date()
    })
    .where(
      and(
        // Terminal statuses that should have completedAt
        eq(schema.cronAgentRuns.status, 'success'),
        isNull(schema.cronAgentRuns.completedAt)
      )
    )
    .returning({ id: schema.cronAgentRuns.id })

  const fixedErrorRuns = await db
    .update(schema.cronAgentRuns)
    .set({
      completedAt: new Date()
    })
    .where(
      and(
        eq(schema.cronAgentRuns.status, 'error'),
        isNull(schema.cronAgentRuns.completedAt)
      )
    )
    .returning({ id: schema.cronAgentRuns.id })

  const fixedBudgetRuns = await db
    .update(schema.cronAgentRuns)
    .set({
      completedAt: new Date()
    })
    .where(
      and(
        eq(schema.cronAgentRuns.status, 'budget_exceeded'),
        isNull(schema.cronAgentRuns.completedAt)
      )
    )
    .returning({ id: schema.cronAgentRuns.id })

  fixed = fixedRuns.length + fixedErrorRuns.length + fixedBudgetRuns.length

  return { cancelled, fixed }
}
