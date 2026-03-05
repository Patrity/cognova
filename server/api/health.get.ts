import { sql } from 'drizzle-orm'
import { getDb } from '~~/server/db'

export default defineEventHandler(async () => {
  let dbHealthy = false

  try {
    const db = getDb()
    await db.execute(sql`SELECT 1`)
    dbHealthy = true
  } catch {
    // DB not reachable
  }

  return {
    data: {
      status: dbHealthy ? 'healthy' : 'degraded',
      db: dbHealthy ? 'connected' : 'disconnected',
      version: '0.1.0',
      timestamp: new Date().toISOString()
    }
  }
})
