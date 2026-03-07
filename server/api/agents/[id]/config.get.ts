import { eq, and, isNull } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'

export default defineEventHandler(async (event) => {
  const agentId = getRouterParam(event, 'id')
  if (!agentId)
    throw createError({ statusCode: 400, message: 'Agent ID is required' })

  const userId = event.context.user.id
  const db = getDb()

  // Try user-scoped config first
  const [userConfig] = await db.select()
    .from(schema.agentConfigs)
    .where(and(
      eq(schema.agentConfigs.agentId, agentId),
      eq(schema.agentConfigs.userId, userId)
    ))
    .limit(1)

  if (userConfig)
    return { data: userConfig.configJson }

  // Fallback to global config (userId = null)
  const [globalConfig] = await db.select()
    .from(schema.agentConfigs)
    .where(and(
      eq(schema.agentConfigs.agentId, agentId),
      isNull(schema.agentConfigs.userId)
    ))
    .limit(1)

  return { data: globalConfig?.configJson ?? {} }
})
