import { eq } from 'drizzle-orm'
import { getDb } from '~~/server/db'
import * as schema from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, message: 'Document ID is required' })

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id))
    throw createError({ statusCode: 400, message: 'Invalid document ID format' })

  const db = getDb()
  const user = event.context.user // May be null for unauthenticated requests

  const document = await db.query.documents.findFirst({
    where: eq(schema.documents.id, id),
    with: {
      creator: {
        columns: { id: true, name: true }
      }
    }
  })

  // 404 if not found or deleted
  if (!document || document.deletedAt)
    throw createError({ statusCode: 404, message: 'Document not found' })

  const isOwner = user?.id === document.createdBy

  // Access control: owner always has access, otherwise check sharing settings
  if (!isOwner) {
    if (!document.shared)
      throw createError({ statusCode: 403, message: 'This document is not shared' })

    // shared=true with any shareType (public or private) allows access
    // Having the UUID = having the link for private documents
  }

  return {
    data: {
      document: {
        id: document.id,
        title: document.title,
        path: document.path,
        fileType: document.fileType,
        shared: document.shared,
        shareType: document.shareType,
        tags: document.tags || [],
        createdAt: document.createdAt,
        modifiedAt: document.modifiedAt,
        creatorName: document.creator?.name || null
      },
      content: document.fileType === 'markdown' ? document.content : null,
      isOwner
    }
  }
})
