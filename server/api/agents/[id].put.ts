import { eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { invalidateAgentCache } from '~~/server/agents/loader'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, message: 'Agent ID is required' })

  const body = await readBody<{ name?: string, enabled?: boolean }>(event)
  const db = getDb()

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (body.name !== undefined) updates.name = body.name
  if (body.enabled !== undefined) updates.enabled = body.enabled

  const [updated] = await db.update(schema.installedAgents)
    .set(updates)
    .where(eq(schema.installedAgents.id, id))
    .returning()

  if (!updated)
    throw createError({ statusCode: 404, message: 'Agent not found' })

  invalidateAgentCache(id)
  return { data: updated }
})
