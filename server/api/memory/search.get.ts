import { sql, desc, eq, and, gte, inArray } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'
import type { MemoryChunk, MemoryChunkType } from '~~/shared/types'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const query = getQuery(event)
  const db = getDb()

  const searchQuery = query.query as string | undefined
  const projectPath = query.projectPath as string | undefined
  const chunkType = query.chunkType as MemoryChunkType | undefined
  const minRelevance = query.minRelevance ? parseFloat(query.minRelevance as string) : undefined
  const limit = Math.min(parseInt(query.limit as string) || 20, 100)

  const conditions = []

  // Project filter
  if (projectPath)
    conditions.push(eq(schema.memoryChunks.projectPath, projectPath))

  // Type filter
  if (chunkType)
    conditions.push(eq(schema.memoryChunks.chunkType, chunkType))

  // Relevance filter
  if (minRelevance !== undefined)
    conditions.push(gte(schema.memoryChunks.relevanceScore, minRelevance))

  // Full-text search via tsvector + GIN index
  if (searchQuery) {
    const ftsResult = await db.execute<{ id: string }>(sql`
      SELECT id FROM memory_chunks
      WHERE search_vector @@ plainto_tsquery('english', ${searchQuery})
      ORDER BY ts_rank(search_vector, plainto_tsquery('english', ${searchQuery})) DESC
      LIMIT ${limit}
    `)
    const ids = ftsResult.map(r => r.id)
    if (ids.length === 0) return { data: [] as MemoryChunk[] }
    conditions.push(inArray(schema.memoryChunks.id, ids))
  }

  let dbQuery = db.select()
    .from(schema.memoryChunks)

  if (conditions.length > 0)
    dbQuery = dbQuery.where(and(...conditions)) as typeof dbQuery

  const memories = await dbQuery
    .orderBy(
      desc(schema.memoryChunks.relevanceScore),
      desc(schema.memoryChunks.createdAt)
    )
    .limit(limit)

  // Update access count and timestamp for retrieved memories
  if (memories.length > 0) {
    try {
      const ids = memories.map(m => m.id)
      await db.execute(sql`
        UPDATE memory_chunks
        SET access_count = access_count + 1,
            last_accessed_at = NOW()
        WHERE id = ANY(ARRAY[${sql.join(ids.map(id => sql`${id}`), sql`, `)}]::uuid[])
      `)
    } catch (e) {
      // Don't fail the request if access count update fails
      console.error('[memory/search] Failed to update access count:', e)
    }
  }

  return { data: memories as MemoryChunk[] }
})
