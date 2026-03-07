import { eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const query = getQuery(event)

  // ?all=true returns all agents including disabled (for management page)
  const data = query.all === 'true'
    ? await db.select().from(schema.installedAgents)
    : await db.select().from(schema.installedAgents).where(eq(schema.installedAgents.enabled, true))

  return { data }
})
