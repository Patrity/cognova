import { sql } from 'drizzle-orm'
import { getDb } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'
import type { MemoryChunk, MemoryChunkType } from '~~/shared/types'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const query = getQuery(event)
  const db = getDb()

  const searchQuery = query.query as string | undefined
  const projectPath = query.projectPath as string | undefined
  const chunkType = query.chunkType as MemoryChunkType | undefined
  const limit = Math.min(parseInt(query.limit as string) || 20, 100)

  // Build WHERE conditions
  const conditions: ReturnType<typeof sql>[] = []

  if (projectPath)
    conditions.push(sql`project_path = ${projectPath}`)

  if (chunkType)
    conditions.push(sql`chunk_type = ${chunkType}`)

  if (searchQuery)
    conditions.push(sql`search_vector @@ plainto_tsquery('english', ${searchQuery})`)

  const whereClause = conditions.length > 0
    ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
    : sql``

  // Computed score: FTS rank (if searching) * access boost * recency decay
  const scoreExpr = searchQuery
    ? sql`
        ts_rank(search_vector, plainto_tsquery('english', ${searchQuery}))
        * (1.0 + LN(1 + access_count))
        * (1.0 / (1.0 + EXTRACT(EPOCH FROM NOW() - COALESCE(last_accessed_at, created_at)) / 2592000))
      `
    : sql`
        (1.0 + LN(1 + access_count))
        * (1.0 / (1.0 + EXTRACT(EPOCH FROM NOW() - COALESCE(last_accessed_at, created_at)) / 2592000))
      `

  const memories = (await db.execute(sql`
    SELECT *, ${scoreExpr} AS score
    FROM memory_chunks
    ${whereClause}
    ORDER BY score DESC
    LIMIT ${limit}
  `)) as unknown as MemoryChunk[]

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

  return { data: memories }
})
