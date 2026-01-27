import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { sql } from 'drizzle-orm'
import * as schema from './schema'
import { setDbState } from '~~/server/utils/db-state'

interface DbConfig {
  ssl: boolean | 'require' | 'prefer'
  max: number
  idleTimeout: number
  connectTimeout: number
}

function getDbConfig(): DbConfig {
  const url = process.env.DATABASE_URL || ''
  const isNeon = url.includes('neon.tech')
  const isLocal = url.includes('localhost') || url.includes('db:5432') || url.includes('127.0.0.1')

  return {
    ssl: isNeon ? 'require' : false,
    max: isLocal ? 10 : 5,
    idleTimeout: isNeon ? 20 : 0,
    connectTimeout: isNeon ? 10 : 5
  }
}

let queryClient: ReturnType<typeof postgres> | null = null
let db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getDb() {
  if (!db) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString)
      throw new Error('DATABASE_URL not configured')

    const config = getDbConfig()
    queryClient = postgres(connectionString, {
      ssl: config.ssl,
      max: config.max,
      idle_timeout: config.idleTimeout,
      connect_timeout: config.connectTimeout
    })
    db = drizzle(queryClient, { schema })
  }
  return db
}

export function getQueryClient() {
  if (!queryClient)
    getDb()
  return queryClient!
}

export async function warmupDb(): Promise<boolean> {
  try {
    const database = getDb()
    await database.execute(sql`SELECT 1`)
    setDbState(true)
    console.log('[db] Connection verified')
    return true
  } catch (error) {
    console.error('[db] Warmup failed:', error)
    setDbState(false, error instanceof Error ? error.message : 'Connection failed')
    return false
  }
}

export async function closeDb(): Promise<void> {
  if (queryClient) {
    await queryClient.end()
    queryClient = null
    db = null
  }
}

export { schema }
