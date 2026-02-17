import { eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'
import { notifyResourceChange } from '~~/server/utils/notify-resource'

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

  const userId = event.context.user?.id

  // Soft delete
  const [project] = await db
    .update(schema.projects)
    .set({
      deletedAt: new Date(),
      deletedBy: userId,
      modifiedAt: new Date(),
      modifiedBy: userId
    })
    .where(eq(schema.projects.id, id))
    .returning()

  notifyResourceChange({ resource: 'project', action: 'delete', resourceId: id, resourceName: project.name })

  return { data: project }
})
