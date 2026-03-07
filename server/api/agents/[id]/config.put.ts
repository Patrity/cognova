import { eq, and } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { invalidateAgentCache } from '~~/server/agents/loader'

export default defineEventHandler(async (event) => {
  const agentId = getRouterParam(event, 'id')
  if (!agentId)
    throw createError({ statusCode: 400, message: 'Agent ID is required' })

  const userId = event.context.user.id
  const body = await readBody<{ configJson: Record<string, unknown> }>(event)
  if (!body?.configJson)
    throw createError({ statusCode: 400, message: 'configJson is required' })

  const db = getDb()

  // Upsert user-scoped config
  const [existing] = await db.select()
    .from(schema.agentConfigs)
    .where(and(
      eq(schema.agentConfigs.agentId, agentId),
      eq(schema.agentConfigs.userId, userId)
    ))
    .limit(1)

  if (existing) {
    await db.update(schema.agentConfigs)
      .set({ configJson: body.configJson, updatedAt: new Date() })
      .where(eq(schema.agentConfigs.id, existing.id))
  } else {
    await db.insert(schema.agentConfigs)
      .values({
        agentId,
        userId,
        configJson: body.configJson
      })
  }

  invalidateAgentCache(agentId)
  return { data: { saved: true } }
})
