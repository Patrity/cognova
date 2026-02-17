import { eq } from 'drizzle-orm'
import { writeFile, mkdir } from 'fs/promises'
import { dirname } from 'path'
import { getDb } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { requireDb } from '~~/server/utils/db-guard'
import { validatePath } from '~~/server/utils/path-validator'
import { stringifyFrontmatter } from '~~/server/utils/frontmatter'
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

  if (!document.deletedAt)
    throw createError({ statusCode: 400, message: 'Document is not deleted' })

  const absolutePath = validatePath(document.path)

  // Recreate file if we have content
  if (document.fileType === 'markdown' && document.content) {
    const metadata: Record<string, unknown> = {}
    if (document.title) metadata.title = document.title
    if (document.tags?.length) metadata.tags = document.tags
    if (document.projectId) metadata.project = document.projectId
    if (document.shared) metadata.shared = document.shared
    if (document.shareType) metadata.shareType = document.shareType

    const fileContent = stringifyFrontmatter(metadata, document.content)

    try {
      await mkdir(dirname(absolutePath), { recursive: true })
      await writeFile(absolutePath, fileContent, 'utf-8')
    } catch {
      throw createError({ statusCode: 500, message: 'Failed to restore file' })
    }
  }

  // Clear soft delete
  await db.update(schema.documents).set({
    deletedAt: null,
    deletedBy: null,
    modifiedAt: new Date(),
    modifiedBy: userId
  }).where(eq(schema.documents.id, id))

  const restored = await db.query.documents.findFirst({
    where: eq(schema.documents.id, id),
    with: { project: true }
  })

  notifyResourceChange({ resource: 'document', action: 'restore', resourceId: id, resourceName: restored?.title })

  return { data: restored }
})
