import { eq } from 'drizzle-orm'
import { readFile } from 'fs/promises'
import { basename } from 'path'
import { getDb } from '~~/server/db'
import { sharedDocuments } from '~~/server/db/schema'
import { validateKnowledgePath } from '~~/server/utils/knowledge-path'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug)
    throw createError({ statusCode: 400, message: 'Slug is required' })

  const db = getDb()
  const [doc] = await db.select()
    .from(sharedDocuments)
    .where(eq(sharedDocuments.publicSlug, slug))
    .limit(1)

  if (!doc || !doc.isPublic)
    throw createError({ statusCode: 404, message: 'Document not found' })

  const filePath = validateKnowledgePath(doc.filePath)
  const content = await readFile(filePath, 'utf-8').catch(() => null)

  if (content === null)
    throw createError({ statusCode: 404, message: 'File not found on disk' })

  return {
    data: {
      document: {
        title: doc.title || basename(doc.filePath),
        filePath: doc.filePath,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      },
      content
    }
  }
})
