import { desc, eq, sql } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'
import type { MemoryChunk, MemoryContextResponse } from '~~/shared/types'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const query = getQuery(event)
  const db = getDb()

  const projectPath = query.project as string | undefined
  const limit = Math.min(parseInt(query.limit as string) || 5, 20)

  // Get recent, high-relevance memories for this project
  let dbQuery = db.select()
    .from(schema.memoryChunks)

  if (projectPath)
    dbQuery = dbQuery.where(eq(schema.memoryChunks.projectPath, projectPath)) as typeof dbQuery

  const memories = await dbQuery
    .orderBy(
      desc(schema.memoryChunks.relevanceScore),
      desc(schema.memoryChunks.createdAt)
    )
    .limit(limit)

  // Update access count for retrieved memories
  if (memories.length > 0) {
    const ids = memories.map(m => m.id)
    await db.execute(sql`
      UPDATE memory_chunks
      SET access_count = access_count + 1,
          last_accessed_at = NOW()
      WHERE id = ANY(${ids})
    `)
  }

  // Format for Claude context injection
  const formatted = formatForContext(memories as MemoryChunk[])

  const response: MemoryContextResponse = {
    memories: memories as MemoryChunk[],
    formatted
  }

  return { data: response }
})

function formatForContext(memories: MemoryChunk[]): string {
  if (memories.length === 0)
    return ''

  const lines = ['## Previous Context\n']

  // Group by type
  const byType = memories.reduce((acc, m) => {
    if (!acc[m.chunkType])
      acc[m.chunkType] = []
    acc[m.chunkType]!.push(m)
    return acc
  }, {} as Record<string, MemoryChunk[]>)

  const typeLabels: Record<string, string> = {
    decision: 'Decisions',
    fact: 'Key Facts',
    solution: 'Solutions',
    pattern: 'Patterns',
    preference: 'Preferences',
    summary: 'Summaries'
  }

  for (const [type, items] of Object.entries(byType)) {
    const label = typeLabels[type] || type
    lines.push(`### ${label}`)
    for (const item of items)
      lines.push(`- ${item.content}`)
    lines.push('')
  }

  return lines.join('\n')
}
