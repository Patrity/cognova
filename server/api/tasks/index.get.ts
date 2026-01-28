import { eq, isNull, ilike, inArray, and, or } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const query = getQuery(event)
  const includeDeleted = query.includeDeleted === 'true'
  const status = query.status as string | string[] | undefined
  const projectId = query.projectId as string | undefined
  const search = query.search as string | undefined

  const db = getDb()

  const conditions = []

  // Soft delete filter
  if (!includeDeleted)
    conditions.push(isNull(schema.tasks.deletedAt))

  // Status filter (can be single or array)
  if (status) {
    const statuses = (Array.isArray(status) ? status : [status]) as ('todo' | 'in_progress' | 'done' | 'blocked')[]
    conditions.push(inArray(schema.tasks.status, statuses))
  }

  // Project filter
  if (projectId)
    conditions.push(eq(schema.tasks.projectId, projectId))

  // Search filter (title and description)
  if (search) {
    const searchPattern = `%${search}%`
    conditions.push(
      or(
        ilike(schema.tasks.title, searchPattern),
        ilike(schema.tasks.description, searchPattern)
      )
    )
  }

  const tasks = await db.query.tasks.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      project: true,
      creator: true
    },
    orderBy: (tasks, { desc }) => [desc(tasks.createdAt)]
  })

  return { data: tasks }
})
