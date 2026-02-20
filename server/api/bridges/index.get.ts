import { getDb } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const db = getDb()

  const bridges = await db.query.bridges.findMany({
    orderBy: (b, { asc }) => [asc(b.platform)],
    with: { creator: true }
  })

  return { data: bridges }
})
