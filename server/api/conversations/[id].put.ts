import { eq, and } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.user.id
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, message: 'Conversation ID is required' })

  const body = await readBody(event)
  const db = getDb()

  const [conversation] = await db.select()
    .from(schema.conversations)
    .where(and(
      eq(schema.conversations.id, id),
      eq(schema.conversations.userId, userId)
    ))
    .limit(1)

  if (!conversation)
    throw createError({ statusCode: 404, message: 'Conversation not found' })

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (typeof body.title === 'string')
    updates.title = body.title

  const [updated] = await db.update(schema.conversations)
    .set(updates)
    .where(eq(schema.conversations.id, id))
    .returning()

  return { data: updated }
})
