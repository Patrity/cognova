import { eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'
import { executeAgent } from '~~/server/services/agent-executor'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Agent ID is required' })
  }

  const db = getDb()

  const agent = await db.query.cronAgents.findFirst({
    where: eq(schema.cronAgents.id, id)
  })

  if (!agent) {
    throw createError({ statusCode: 404, message: 'Agent not found' })
  }

  // Execute asynchronously (don't wait for completion)
  executeAgent({
    id: agent.id,
    name: agent.name,
    prompt: agent.prompt,
    maxTurns: agent.maxTurns ?? 50,
    maxBudgetUsd: agent.maxBudgetUsd ?? undefined
  }).catch(err => console.error(`[agent] Manual run failed for ${agent.name}:`, err))

  return { message: 'Agent started' }
})
