import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'
import { extractMemories, extractMemoriesFromTranscriptFile } from '~~/server/services/memory-extractor'
import type { ExtractMemoryInput, MemoryChunk } from '~~/shared/types'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const body = await readBody<ExtractMemoryInput & { transcriptPath?: string }>(event)
  const db = getDb()

  let memories: Awaited<ReturnType<typeof extractMemories>> = []

  // Extract from transcript file path or raw transcript
  if (body.transcriptPath)
    memories = await extractMemoriesFromTranscriptFile(body.transcriptPath)
  else if (body.transcript)
    memories = await extractMemories(body.transcript)
  else
    throw createError({ statusCode: 400, message: 'Either transcript or transcriptPath is required' })

  if (memories.length === 0)
    return { data: [], message: 'No memories worth extracting' }

  // Store extracted memories
  const inserted = await db.insert(schema.memoryChunks)
    .values(memories.map(m => ({
      sessionId: body.sessionId,
      projectPath: body.projectPath,
      chunkType: m.type,
      content: m.content,
      relevanceScore: m.relevance
    })))
    .returning()

  console.log(`[memory] Extracted and stored ${inserted.length} memories`)

  return {
    data: inserted as MemoryChunk[],
    message: `Extracted ${inserted.length} memories`
  }
})
