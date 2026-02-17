import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'
import { notifyResourceChange } from '~~/server/utils/notify-resource'
import type { CreateMemoryInput, MemoryChunk } from '~~/shared/types'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const body = await readBody<CreateMemoryInput>(event)
  const db = getDb()

  if (!body.content)
    throw createError({ statusCode: 400, message: 'content is required' })

  if (!body.chunkType)
    throw createError({ statusCode: 400, message: 'chunkType is required' })

  const [inserted] = await db.insert(schema.memoryChunks)
    .values({
      sessionId: body.sessionId,
      projectPath: body.projectPath,
      chunkType: body.chunkType,
      content: body.content,
      sourceExcerpt: body.sourceExcerpt,
      relevanceScore: body.relevanceScore ?? 1.0
    })
    .returning()

  console.log(`[memory] Stored memory: ${body.chunkType} - ${body.content.slice(0, 50)}...`)

  notifyResourceChange({ resource: 'memory', action: 'create', resourceId: inserted.id, resourceName: body.chunkType })

  return { data: inserted as MemoryChunk }
})
