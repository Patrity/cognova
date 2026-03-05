import { eq, and } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.user.id
  const body = await readBody(event)
  const db = getDb()

  // If agentId provided, verify it exists and is enabled
  if (body.agentId) {
    const [agent] = await db.select()
      .from(schema.installedAgents)
      .where(and(
        eq(schema.installedAgents.id, body.agentId),
        eq(schema.installedAgents.enabled, true)
      ))
      .limit(1)

    if (!agent)
      throw createError({ statusCode: 404, message: 'Agent not found or disabled' })
  }

  const [conversation] = await db.insert(schema.conversations)
    .values({
      userId,
      agentId: body.agentId || null,
      title: body.title || null
    })
    .returning()

  return { data: conversation }
})
