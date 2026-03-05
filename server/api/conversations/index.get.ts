import { eq, desc } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.user.id
  const db = getDb()

  const data = await db.select()
    .from(schema.conversations)
    .where(eq(schema.conversations.userId, userId))
    .orderBy(desc(schema.conversations.updatedAt))

  return { data }
})
