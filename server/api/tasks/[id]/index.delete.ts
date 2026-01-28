import { eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const id = getRouterParam(event, 'id')

  if (!id)
    throw createError({ statusCode: 400, message: 'Task ID is required' })

  const db = getDb()

  // Check task exists
  const [existing] = await db
    .select({ id: schema.tasks.id })
    .from(schema.tasks)
    .where(eq(schema.tasks.id, id))
    .limit(1)

  if (!existing)
    throw createError({ statusCode: 404, message: 'Task not found' })

  // Soft delete
  await db
    .update(schema.tasks)
    .set({
      deletedAt: new Date(),
      modifiedAt: new Date()
    })
    .where(eq(schema.tasks.id, id))

  // Fetch updated task with project relation
  const [task] = await db.query.tasks.findMany({
    where: (tasks, { eq }) => eq(tasks.id, id),
    with: { project: true },
    limit: 1
  })

  return { data: task }
})
