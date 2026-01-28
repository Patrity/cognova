import { getDb } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const id = getRouterParam(event, 'id')

  if (!id)
    throw createError({ statusCode: 400, message: 'Task ID is required' })

  const db = getDb()

  const [task] = await db.query.tasks.findMany({
    where: (tasks, { eq }) => eq(tasks.id, id),
    with: { project: true },
    limit: 1
  })

  if (!task)
    throw createError({ statusCode: 404, message: 'Task not found' })

  return { data: task }
})
