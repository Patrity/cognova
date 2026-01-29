import { eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'
import { scheduleAgent, unscheduleAgent } from '~~/server/services/cron-scheduler'

interface UpdateAgentBody {
  name?: string
  description?: string
  schedule?: string
  prompt?: string
  enabled?: boolean
  maxTurns?: number
  maxBudgetUsd?: number | null
}

export default defineEventHandler(async (event) => {
  requireDb(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Agent ID is required' })
  }

  const body = await readBody<UpdateAgentBody>(event)
  const db = getDb()

  // Get existing agent
  const existing = await db.query.cronAgents.findFirst({
    where: eq(schema.cronAgents.id, id)
  })

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Agent not found' })
  }

  // Update agent
  const [agent] = await db.update(schema.cronAgents)
    .set({
      ...body,
      updatedAt: new Date()
    })
    .where(eq(schema.cronAgents.id, id))
    .returning()

  // Reschedule if schedule or enabled changed
  if (body.schedule !== undefined || body.enabled !== undefined) {
    if (agent!.enabled) {
      scheduleAgent(agent!)
    } else {
      unscheduleAgent(agent!.id)
    }
  }

  return { data: agent }
})
