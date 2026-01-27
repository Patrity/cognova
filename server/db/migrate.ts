import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { sql } from 'drizzle-orm'
import { getDb } from './index'

const MIGRATION_LOCK_ID = 728492 // Arbitrary but consistent ID

export async function runMigrations(): Promise<boolean> {
  const db = getDb()

  console.log('[db] Attempting to acquire migration lock...')

  try {
    // Try to acquire advisory lock (non-blocking)
    const lockResult = await db.execute<{ pg_try_advisory_lock: boolean }>(
      sql`SELECT pg_try_advisory_lock(${MIGRATION_LOCK_ID})`
    )

    const acquired = lockResult[0]?.pg_try_advisory_lock === true

    if (!acquired) {
      console.log('[db] Migration lock held by another instance, skipping')
      return false
    }

    console.log('[db] Lock acquired, running migrations...')
    await migrate(db, { migrationsFolder: './server/drizzle/migrations' })
    console.log('[db] Migrations complete')

    return true
  } catch (error) {
    console.error('[db] Migration failed:', error)
    throw error
  } finally {
    // Always release the lock
    try {
      await db.execute(sql`SELECT pg_advisory_unlock(${MIGRATION_LOCK_ID})`)
    } catch {
      // Ignore unlock errors
    }
  }
}
