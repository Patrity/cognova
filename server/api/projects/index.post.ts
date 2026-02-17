import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'
import { notifyResourceChange } from '~~/server/utils/notify-resource'
import type { CreateProjectInput } from '~~/shared/types'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const body = await readBody<CreateProjectInput>(event)

  if (!body.name?.trim())
    throw createError({ statusCode: 400, message: 'Project name is required' })

  if (!body.color?.trim())
    throw createError({ statusCode: 400, message: 'Project color is required' })

  // Validate hex color format
  if (!/^#[0-9A-Fa-f]{6}$/.test(body.color))
    throw createError({ statusCode: 400, message: 'Color must be a valid hex color (e.g., #3b82f6)' })

  const db = getDb()
  const userId = event.context.user?.id

  const [project] = await db
    .insert(schema.projects)
    .values({
      name: body.name.trim(),
      color: body.color,
      description: body.description?.trim() || null,
      createdBy: userId
    })
    .returning()

  notifyResourceChange({ resource: 'project', action: 'create', resourceId: project!.id, resourceName: project!.name })

  return { data: project }
})
