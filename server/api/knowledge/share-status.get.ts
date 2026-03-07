import { eq, and } from 'drizzle-orm'
import { getDb } from '~~/server/db'
import { sharedDocuments } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const userId = event.context.user.id
  const query = getQuery(event)
  const path = query.path as string
  if (!path)
    throw createError({ statusCode: 400, message: 'File path is required' })

  const db = getDb()
  const [doc] = await db.select()
    .from(sharedDocuments)
    .where(and(
      eq(sharedDocuments.userId, userId),
      eq(sharedDocuments.filePath, path)
    ))
    .limit(1)

  return { data: doc || null }
})
