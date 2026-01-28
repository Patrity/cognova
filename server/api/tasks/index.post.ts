import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'
import type { CreateTaskInput } from '~~/shared/types'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const body = await readBody<CreateTaskInput>(event)

  if (!body.title?.trim())
    throw createError({ statusCode: 400, message: 'Task title is required' })

  // Validate priority if provided
  if (body.priority !== undefined && (body.priority < 1 || body.priority > 3))
    throw createError({ statusCode: 400, message: 'Priority must be 1 (Low), 2 (Medium), or 3 (High)' })

  const db = getDb()

  const userId = event.context.user?.id

  const result = await db
    .insert(schema.tasks)
    .values({
      title: body.title.trim(),
      description: body.description?.trim() || null,
      status: body.status || 'todo',
      priority: body.priority ?? 2,
      projectId: body.projectId || null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      tags: body.tags || [],
      createdBy: userId
    })
    .returning()

  const task = result[0]
  if (!task)
    throw createError({ statusCode: 500, message: 'Failed to create task' })

  // Fetch with project relation
  const [taskWithProject] = await db.query.tasks.findMany({
    where: (tasks, { eq }) => eq(tasks.id, task.id),
    with: { project: true },
    limit: 1
  })

  return { data: taskWithProject }
})
