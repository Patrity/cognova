import { eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'
import type { UpdateTaskInput } from '~~/shared/types'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const id = getRouterParam(event, 'id')

  if (!id)
    throw createError({ statusCode: 400, message: 'Task ID is required' })

  const body = await readBody<UpdateTaskInput>(event)

  // Validate priority if provided
  if (body.priority !== undefined && (body.priority < 1 || body.priority > 3))
    throw createError({ statusCode: 400, message: 'Priority must be 1 (Low), 2 (Medium), or 3 (High)' })

  const db = getDb()

  // Check task exists
  const [existing] = await db
    .select({ id: schema.tasks.id, status: schema.tasks.status })
    .from(schema.tasks)
    .where(eq(schema.tasks.id, id))
    .limit(1)

  if (!existing)
    throw createError({ statusCode: 404, message: 'Task not found' })

  const userId = event.context.user?.id

  const updates: Record<string, unknown> = {
    modifiedAt: new Date(),
    modifiedBy: userId
  }

  if (body.title !== undefined) updates.title = body.title.trim()
  if (body.description !== undefined) updates.description = body.description?.trim() || null
  if (body.priority !== undefined) updates.priority = body.priority
  if (body.projectId !== undefined) updates.projectId = body.projectId || null
  if (body.tags !== undefined) updates.tags = body.tags
  if (body.dueDate !== undefined) updates.dueDate = body.dueDate ? new Date(body.dueDate) : null

  // Handle status change
  if (body.status !== undefined) {
    updates.status = body.status

    // Auto-set completedAt when marking as done
    if (body.status === 'done' && existing.status !== 'done')
      updates.completedAt = new Date()
    else if (body.status !== 'done' && existing.status === 'done')
      updates.completedAt = null
  }

  await db
    .update(schema.tasks)
    .set(updates)
    .where(eq(schema.tasks.id, id))

  // Fetch updated task with project relation
  const [task] = await db.query.tasks.findMany({
    where: (tasks, { eq }) => eq(tasks.id, id),
    with: { project: true },
    limit: 1
  })

  return { data: task }
})
