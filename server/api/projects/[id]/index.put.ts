import { eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'
import type { UpdateProjectInput } from '~~/shared/types'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const id = getRouterParam(event, 'id')

  if (!id)
    throw createError({ statusCode: 400, message: 'Project ID is required' })

  const body = await readBody<UpdateProjectInput>(event)

  // Validate color if provided
  if (body.color && !/^#[0-9A-Fa-f]{6}$/.test(body.color))
    throw createError({ statusCode: 400, message: 'Color must be a valid hex color (e.g., #3b82f6)' })

  const db = getDb()

  // Check project exists
  const [existing] = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(eq(schema.projects.id, id))
    .limit(1)

  if (!existing)
    throw createError({ statusCode: 404, message: 'Project not found' })

  const updates: Record<string, unknown> = {
    modifiedAt: new Date()
  }

  if (body.name !== undefined) updates.name = body.name.trim()
  if (body.color !== undefined) updates.color = body.color
  if (body.description !== undefined) updates.description = body.description?.trim() || null

  const [project] = await db
    .update(schema.projects)
    .set(updates)
    .where(eq(schema.projects.id, id))
    .returning()

  return { data: project }
})
