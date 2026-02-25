import { sql } from 'drizzle-orm'
import { getDb } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'
import type { MemoryChunk, MemoryContextResponse } from '~~/shared/types'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const query = getQuery(event)
  const db = getDb()

  const projectPath = query.project as string | undefined
  const limit = Math.min(parseInt(query.limit as string) || 5, 20)

  // Score memories by access frequency + recency (no static relevance)
  // access boost: ln(1 + access_count) gives diminishing returns
  // recency: 30-day half-life decay on last access or creation time
  const projectFilter = projectPath
    ? sql`AND project_path = ${projectPath}`
    : sql``

  const memories = (await db.execute(sql`
    SELECT *,
      (1.0 + LN(1 + access_count))
      * (1.0 / (1.0 + EXTRACT(EPOCH FROM NOW() - COALESCE(last_accessed_at, created_at)) / 2592000))
      AS score
    FROM memory_chunks
    WHERE 1=1 ${projectFilter}
    ORDER BY score DESC
    LIMIT ${limit}
  `)) as unknown as MemoryChunk[]

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
  const formatted = formatForContext(memories)

  const response: MemoryContextResponse = {
    memories,
    formatted
  }

  return { data: response }
})

function formatForContext(memories: MemoryChunk[]): string {
  if (memories.length === 0)
    return ''

  const lines = [`${memories.length} memories loaded:\n`]

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
