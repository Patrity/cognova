import { eq, isNull, ilike, and, or } from 'drizzle-orm'
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

  if (search) {
    const pattern = `%${search}%`
    conditions.push(
      or(
        ilike(schema.documents.title, pattern),
        ilike(schema.documents.content, pattern),
        ilike(schema.documents.path, pattern)
      )
    )
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
