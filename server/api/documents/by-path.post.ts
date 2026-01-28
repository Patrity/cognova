import { eq } from 'drizzle-orm'
import { readFile } from 'fs/promises'
import { basename } from 'path'
import { getDb } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { requireDb } from '~~/server/utils/db-guard'
import { validatePath } from '~~/server/utils/path-validator'
import { parseFrontmatter, extractTitle, computeContentHash, isBinaryFile, getMimeType } from '~~/server/utils/frontmatter'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const body = await readBody(event)
  const requestedPath = body.path

  if (!requestedPath)
    throw createError({ statusCode: 400, message: 'Path is required' })

  const absolutePath = validatePath(requestedPath)
  const db = getDb()
  const filename = basename(requestedPath)

  // Check if document exists in DB
  let document = await db.query.documents.findFirst({
    where: eq(schema.documents.path, requestedPath),
    with: { project: true }
  })

  // Read file from disk
  let fileContent: string
  try {
    fileContent = await readFile(absolutePath, 'utf-8')
  } catch (error: unknown) {
    const err = error as NodeJS.ErrnoException
    if (err.code === 'ENOENT')
      throw createError({ statusCode: 404, message: 'File not found' })
    throw createError({ statusCode: 500, message: 'Failed to read file' })
  }

  const isBinary = isBinaryFile(filename)

  if (isBinary) {
    if (!document) {
      const [newDoc] = await db.insert(schema.documents).values({
        path: requestedPath,
        title: filename,
        fileType: 'binary',
        mimeType: getMimeType(filename),
        syncedAt: new Date(),
        createdBy: event.context.user?.id
      }).returning()

      document = await db.query.documents.findFirst({
        where: eq(schema.documents.id, newDoc.id),
        with: { project: true }
      })
    }

    return {
      data: {
        document,
        metadata: { title: document!.title, tags: [], shared: false },
        body: ''
      }
    }
  }

  // Parse markdown frontmatter
  const { metadata, body: markdownBody } = parseFrontmatter(fileContent)
  const contentHash = computeContentHash(fileContent)
  const title = extractTitle(metadata, markdownBody, filename)

  if (!document) {
    const [newDoc] = await db.insert(schema.documents).values({
      path: requestedPath,
      title,
      content: markdownBody,
      contentHash,
      tags: Array.isArray(metadata.tags) ? metadata.tags as string[] : [],
      projectId: typeof metadata.project === 'string' ? metadata.project : null,
      shared: !!metadata.shared,
      shareType: metadata.shareType as 'public' | 'private' || null,
      fileType: 'markdown',
      syncedAt: new Date(),
      createdBy: event.context.user?.id
    }).returning()

    document = await db.query.documents.findFirst({
      where: eq(schema.documents.id, newDoc.id),
      with: { project: true }
    })
  } else if (document.contentHash !== contentHash) {
    // File changed, update DB
    await db.update(schema.documents).set({
      title,
      content: markdownBody,
      contentHash,
      tags: Array.isArray(metadata.tags) ? metadata.tags as string[] : document.tags,
      syncedAt: new Date(),
      modifiedAt: new Date(),
      modifiedBy: event.context.user?.id
    }).where(eq(schema.documents.id, document.id))

    document = await db.query.documents.findFirst({
      where: eq(schema.documents.id, document.id),
      with: { project: true }
    })
  }

  return {
    data: {
      document,
      metadata: {
        title: document!.title,
        tags: document!.tags || [],
        projectId: document!.projectId,
        shared: document!.shared,
        shareType: document!.shareType,
        ...metadata
      },
      body: markdownBody
    }
  }
})
