import { eq } from 'drizzle-orm'
import { rm, stat } from 'fs/promises'
import { getDb } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { requireDb } from '~~/server/utils/db-guard'
import { validatePath } from '~~/server/utils/path-validator'
import { notifyResourceChange } from '~~/server/utils/notify-resource'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, message: 'Document ID is required' })

  const db = getDb()
  const userId = event.context.user?.id

  const document = await db.query.documents.findFirst({
    where: eq(schema.documents.id, id)
  })

  if (!document)
    throw createError({ statusCode: 404, message: 'Document not found' })

  const absolutePath = validatePath(document.path)

  // Delete file from disk
  try {
    await stat(absolutePath)
    await rm(absolutePath)
  } catch (error: unknown) {
    const err = error as NodeJS.ErrnoException
    if (err.code !== 'ENOENT') {
      console.error('Failed to delete file:', err)
    }
  }

  // Soft delete in database
  await db.update(schema.documents).set({
    deletedAt: new Date(),
    deletedBy: userId,
    modifiedAt: new Date(),
    modifiedBy: userId
  }).where(eq(schema.documents.id, id))

  notifyResourceChange({ resource: 'document', action: 'delete', resourceId: id, resourceName: document.title })

  return { data: { id, deleted: true } }
})
