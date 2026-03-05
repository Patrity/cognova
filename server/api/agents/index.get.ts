import { eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'

export default defineEventHandler(async () => {
  const db = getDb()

  const data = await db.select()
    .from(schema.installedAgents)
    .where(eq(schema.installedAgents.enabled, true))

  return { data }
})
