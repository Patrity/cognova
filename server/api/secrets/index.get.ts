import { getDb } from '~~/server/db'
import { secrets } from '~~/server/db/schema'
import { desc } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const db = getDb()

  const results = await db.query.secrets.findMany({
    columns: {
      id: true,
      key: true,
      description: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: [desc(secrets.createdAt)]
  })

  return { data: results }
})
