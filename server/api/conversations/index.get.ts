import { desc } from 'drizzle-orm'
import { getDb } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { requireDb } from '~~/server/utils/db-guard'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const db = getDb()

  const conversations = await db.select()
    .from(schema.conversations)
    .orderBy(desc(schema.conversations.startedAt))
    .limit(50)

  return { data: conversations }
})
