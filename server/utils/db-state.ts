interface DbState {
  available: boolean
  error?: string
  lastCheck: Date
}

let dbState: DbState = {
  available: false,
  lastCheck: new Date()
}

// Track whether setDbState has been called
let stateInitialized = false

// Promise that resolves when DB state is first set
let dbReadyResolve: ((available: boolean) => void) | null = null
let dbReadyPromise: Promise<boolean> | null = null

export function setDbState(available: boolean, error?: string) {
  dbState = { available, error, lastCheck: new Date() }
  stateInitialized = true

  // Resolve the waiting promise if anyone is waiting
  if (dbReadyResolve) {
    dbReadyResolve(available)
    dbReadyResolve = null
  }
}

export function isDbAvailable(): boolean {
  return dbState.available
}

export function getDbState(): DbState {
  return { ...dbState }
}

/**
 * Wait for the database to be initialized.
 * Returns true if available, false if unavailable or timeout.
 */
export function waitForDb(timeoutMs = 10000): Promise<boolean> {
  // Already initialized
  if (stateInitialized)
    return Promise.resolve(dbState.available)

  // Create promise if not already waiting
  if (!dbReadyPromise) {
    dbReadyPromise = new Promise<boolean>((resolve) => {
      dbReadyResolve = resolve

      // Timeout fallback
      setTimeout(() => {
        if (dbReadyResolve) {
          dbReadyResolve(false)
          dbReadyResolve = null
        }
      }, timeoutMs)
    })
  }

  return dbReadyPromise
}
