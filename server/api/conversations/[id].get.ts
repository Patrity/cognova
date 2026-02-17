import { eq } from 'drizzle-orm'
import { getDb } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { requireDb } from '~~/server/utils/db-guard'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const id = getRouterParam(event, 'id')!
  const db = getDb()

  const [conversation] = await db.select()
    .from(schema.conversations)
    .where(eq(schema.conversations.id, id))
    .limit(1)

  if (!conversation)
    throw createError({ statusCode: 404, message: 'Conversation not found' })

  const messages = await db.select()
    .from(schema.conversationMessages)
    .where(eq(schema.conversationMessages.conversationId, id))
    .orderBy(schema.conversationMessages.createdAt)

  return {
    data: {
      ...conversation,
      messages: messages.map(m => ({
        ...m,
        content: typeof m.content === 'string' ? JSON.parse(m.content) : m.content
      }))
    }
  }
})
