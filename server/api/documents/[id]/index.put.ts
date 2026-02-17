import { eq } from 'drizzle-orm'
import { readFile, writeFile } from 'fs/promises'
import { basename } from 'path'
import { getDb } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { requireDb } from '~~/server/utils/db-guard'
import { validatePath } from '~~/server/utils/path-validator'
import { parseFrontmatter, stringifyFrontmatter, computeContentHash, extractTitle } from '~~/server/utils/frontmatter'
import { notifyResourceChange } from '~~/server/utils/notify-resource'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, message: 'Document ID is required' })

  const body = await readBody(event)
  const db = getDb()
  const userId = event.context.user?.id

  const document = await db.query.documents.findFirst({
    where: eq(schema.documents.id, id)
  })

  if (!document)
    throw createError({ statusCode: 404, message: 'Document not found' })

  if (document.fileType === 'binary')
    throw createError({ statusCode: 400, message: 'Cannot edit binary file metadata' })

  const absolutePath = validatePath(document.path)

  // Read current file
  let fileContent: string
  try {
    fileContent = await readFile(absolutePath, 'utf-8')
  } catch {
    throw createError({ statusCode: 500, message: 'Failed to read file' })
  }

  const { metadata: currentMetadata, body: currentBody } = parseFrontmatter(fileContent)

  // Build new metadata
  const newMetadata: Record<string, unknown> = { ...currentMetadata }

  if (body.title !== undefined) newMetadata.title = body.title
  if (body.tags !== undefined) newMetadata.tags = body.tags
  if (body.projectId !== undefined) newMetadata.project = body.projectId
  if (body.shared !== undefined) newMetadata.shared = body.shared
  if (body.shareType !== undefined) newMetadata.shareType = body.shareType

  // Use new body if provided, otherwise keep current
  const newBody = body.body !== undefined ? body.body : currentBody

  // Reconstruct file content
  const newFileContent = stringifyFrontmatter(newMetadata, newBody)
  const newHash = computeContentHash(newFileContent)
  const filename = basename(document.path)
  const newTitle = extractTitle(newMetadata, newBody, filename)

  // Write file
  try {
    await writeFile(absolutePath, newFileContent, 'utf-8')
  } catch {
    throw createError({ statusCode: 500, message: 'Failed to write file' })
  }

  // Update database
  await db.update(schema.documents).set({
    title: newTitle,
    content: newBody,
    contentHash: newHash,
    tags: Array.isArray(newMetadata.tags) ? newMetadata.tags as string[] : document.tags,
    projectId: body.projectId !== undefined ? body.projectId : document.projectId,
    shared: body.shared !== undefined ? body.shared : document.shared,
    shareType: body.shareType !== undefined ? body.shareType : document.shareType,
    syncedAt: new Date(),
    modifiedAt: new Date(),
    modifiedBy: userId
  }).where(eq(schema.documents.id, id))

  // Return updated document
  const updated = await db.query.documents.findFirst({
    where: eq(schema.documents.id, id),
    with: { project: true }
  })

  notifyResourceChange({ resource: 'document', action: 'edit', resourceId: id, resourceName: updated?.title })

  return {
    data: {
      document: updated,
      metadata: {
        title: updated!.title,
        tags: updated!.tags || [],
        projectId: updated!.projectId,
        shared: updated!.shared,
        shareType: updated!.shareType,
        ...newMetadata
      },
      body: newBody
    }
  }
})
