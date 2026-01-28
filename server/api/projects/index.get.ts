import { isNull } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const query = getQuery(event)
  const includeDeleted = query.includeDeleted === 'true'

  const db = getDb()

  const projects = await db
    .select()
    .from(schema.projects)
    .where(includeDeleted ? undefined : isNull(schema.projects.deletedAt))
    .orderBy(schema.projects.name)

  return { data: projects }
})
