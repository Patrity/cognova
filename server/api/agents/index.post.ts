import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'
import { scheduleAgent } from '~~/server/services/cron-scheduler'

interface CreateAgentBody {
  name: string
  description?: string
  schedule: string
  prompt: string
  enabled?: boolean
  maxTurns?: number
  maxBudgetUsd?: number
}

export default defineEventHandler(async (event) => {
  requireDb(event)

  const body = await readBody<CreateAgentBody>(event)

  if (!body.name || !body.schedule || !body.prompt) {
    throw createError({
      statusCode: 400,
      message: 'Name, schedule, and prompt are required'
    })
  }

  const db = getDb()

  const [agent] = await db.insert(schema.cronAgents)
    .values({
      name: body.name,
      description: body.description,
      schedule: body.schedule,
      prompt: body.prompt,
      enabled: body.enabled ?? true,
      maxTurns: body.maxTurns ?? 50,
      maxBudgetUsd: body.maxBudgetUsd,
      createdBy: event.context.user?.id
    })
    .returning()

  // Schedule if enabled
  if (agent!.enabled) {
    scheduleAgent(agent!)
  }

  return { data: agent }
})
