import { runMigrations } from '~~/server/db/migrate'
import { warmupDb } from '~~/server/db'
import { seedIfEmpty } from '~~/server/db/seed'
import { setDbState } from '~~/server/utils/db-state'

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    )
  ])
}

export default defineNitroPlugin(async () => {
  if (!process.env.DATABASE_URL) {
    console.warn('[db] DATABASE_URL not set, database features disabled')
    setDbState(false, 'DATABASE_URL not configured')
    return
  }

  try {
    // In development, skip migrations - use db:push instead
    // In production, run migrations on startup
    const skipMigrations = process.env.NODE_ENV !== 'production' && process.env.DB_SKIP_MIGRATIONS !== 'false'

    if (skipMigrations) {
      console.log('[db] Skipping migrations in development (use db:push for schema changes)')
    } else {
      try {
        await withTimeout(runMigrations(), 30000, 'Migration')
      } catch (migrationError) {
        // Don't let migration failure prevent DB from being usable
        console.error('[db] Migration issue (continuing anyway):', migrationError instanceof Error ? migrationError.message : migrationError)
      }
    }

    await withTimeout(warmupDb(), 15000, 'DB warmup')

    // Seed default user if database is empty
    await seedIfEmpty()
  } catch (error) {
    console.error('[db] Database initialization failed:', error)

    // In production, don't crash - just disable DB features
    if (process.env.NODE_ENV === 'production') {
      console.error('[db] Continuing with database features disabled')
      setDbState(false, error instanceof Error ? error.message : 'Initialization failed')
    } else {
      // In development, fail fast
      throw error
    }
  }
})
