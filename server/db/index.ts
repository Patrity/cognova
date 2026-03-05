import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { sql } from 'drizzle-orm'
import * as schema from './schema'

let pool: pg.Pool | null = null
let db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getDb() {
  if (!db) {
    const config = useRuntimeConfig()
    const connectionString = config.databaseUrl
    if (!connectionString)
      throw new Error('DATABASE_URL not configured')

    pool = new pg.Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    })
    db = drizzle(pool, { schema })
  }
  return db
}

export function getPool() {
  if (!pool)
    getDb()
  return pool!
}

export async function warmupDb(): Promise<boolean> {
  try {
    const database = getDb()
    await database.execute(sql`SELECT 1`)
    console.log('[db] Connection verified')
    return true
  } catch (error) {
    console.error('[db] Warmup failed:', error)
    return false
  }
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
    db = null
  }
}

export { schema }
