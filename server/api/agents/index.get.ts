import { inArray, sql } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
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
      SELECT id FROM cron_agents
      WHERE search_vector @@ plainto_tsquery('english', ${search})
      ORDER BY ts_rank(search_vector, plainto_tsquery('english', ${search})) DESC
      LIMIT 50
    `)
    const ids = ftsResult.map(r => r.id)
    if (ids.length === 0) return { data: [] }
    where = inArray(schema.cronAgents.id, ids)
  }

  const agents = await db.query.cronAgents.findMany({
    where,
    with: { creator: true },
    orderBy: (agents, { asc }) => [asc(agents.name)]
  })

  return { data: agents }
})
