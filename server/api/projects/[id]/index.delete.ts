import { eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const id = getRouterParam(event, 'id')

  if (!id)
    throw createError({ statusCode: 400, message: 'Project ID is required' })

  const db = getDb()

  // Check project exists
  const [existing] = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(eq(schema.projects.id, id))
    .limit(1)

  if (!existing)
    throw createError({ statusCode: 404, message: 'Project not found' })

  // Soft delete
  const [project] = await db
    .update(schema.projects)
    .set({
      deletedAt: new Date(),
      modifiedAt: new Date()
    })
    .where(eq(schema.projects.id, id))
    .returning()

  return { data: project }
})
