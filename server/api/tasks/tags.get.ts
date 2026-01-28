import { isNull } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const db = getDb()

  // Get all unique tags from non-deleted tasks
  const result = await db
    .select({ tags: schema.tasks.tags })
    .from(schema.tasks)
    .where(isNull(schema.tasks.deletedAt))

  // Flatten and deduplicate tags
  const allTags = result.flatMap(r => r.tags || [])
  const uniqueTags = [...new Set(allTags)].sort()

  return { data: uniqueTags }
})
