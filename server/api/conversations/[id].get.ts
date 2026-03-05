import { eq, and, asc } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.user.id
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, message: 'Conversation ID is required' })

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

  const messages = await db.select()
    .from(schema.messages)
    .where(eq(schema.messages.conversationId, id))
    .orderBy(asc(schema.messages.createdAt))

  return { data: { conversation, messages } }
})
