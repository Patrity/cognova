import { getDb } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const db = getDb()

  const agents = await db.query.cronAgents.findMany({
    with: { creator: true },
    orderBy: (agents, { asc }) => [asc(agents.name)]
  })

  return { data: agents }
})
