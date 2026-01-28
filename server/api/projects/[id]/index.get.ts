import { eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const id = getRouterParam(event, 'id')

  if (!id)
    throw createError({ statusCode: 400, message: 'Project ID is required' })

  const db = getDb()

  const [project] = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, id))
    .limit(1)

  if (!project)
    throw createError({ statusCode: 404, message: 'Project not found' })

  return { data: project }
})
