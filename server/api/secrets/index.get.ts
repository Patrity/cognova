import { eq, desc } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'

export default defineEventHandler(async (event) => {
  const userId = event.context.user.id
  const db = getDb()

  const results = await db.select({
    id: schema.secrets.id,
    key: schema.secrets.key,
    createdAt: schema.secrets.createdAt,
    updatedAt: schema.secrets.updatedAt
  })
    .from(schema.secrets)
    .where(eq(schema.secrets.userId, userId))
    .orderBy(desc(schema.secrets.createdAt))

  return { data: results }
})
