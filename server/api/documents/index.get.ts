import { eq, isNull, inArray, and, sql } from 'drizzle-orm'
import { getDb } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { requireDb } from '~~/server/utils/db-guard'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const query = getQuery(event)
  const includeDeleted = query.includeDeleted === 'true'
  const projectId = query.projectId as string | undefined
  const search = query.search as string | undefined
  const fileType = query.fileType as string | undefined

  const db = getDb()
  const conditions = []

  if (!includeDeleted)
    conditions.push(isNull(schema.documents.deletedAt))

  if (projectId)
    conditions.push(eq(schema.documents.projectId, projectId))

  if (fileType)
    conditions.push(eq(schema.documents.fileType, fileType))

  // Full-text search via tsvector + GIN index
  if (search) {
    const ftsResult = await db.execute<{ id: string }>(sql`
      SELECT id FROM documents
      WHERE search_vector @@ plainto_tsquery('english', ${search})
      ORDER BY ts_rank(search_vector, plainto_tsquery('english', ${search})) DESC
      LIMIT 50
    `)
    const ids = ftsResult.map(r => r.id)
    if (ids.length === 0) return { data: [] }
    conditions.push(inArray(schema.documents.id, ids))
  }

  const documents = await db.query.documents.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: { project: true },
    orderBy: (docs, { desc }) => [desc(docs.modifiedAt)],
    columns: {
      content: false
    }
  })

  return { data: documents }
})
