import { desc, inArray, sql } from 'drizzle-orm'
import { getDb } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { requireDb } from '~~/server/utils/db-guard'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const query = getQuery(event)
  const search = query.search as string | undefined

  const db = getDb()

  // Full-text search via tsvector + GIN index
  let where
  if (search) {
    const ftsResult = await db.execute<{ id: string }>(sql`
      SELECT id FROM conversations
      WHERE search_vector @@ plainto_tsquery('english', ${search})
      ORDER BY ts_rank(search_vector, plainto_tsquery('english', ${search})) DESC
      LIMIT 50
    `)
    const ids = ftsResult.map(r => r.id)
    if (ids.length === 0) return { data: [] }
    where = inArray(schema.conversations.id, ids)
  }

  // Main Chat always first, then by most recent
  const conversations = await db.query.conversations.findMany({
    where,
    orderBy: [desc(schema.conversations.isMain), desc(schema.conversations.startedAt)],
    limit: 50
  })

  return { data: conversations }
})
