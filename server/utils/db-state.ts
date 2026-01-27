interface DbState {
  available: boolean
  error?: string
  lastCheck: Date
}

let dbState: DbState = {
  available: false,
  lastCheck: new Date()
}

export function setDbState(available: boolean, error?: string) {
  dbState = { available, error, lastCheck: new Date() }
}

export function isDbAvailable(): boolean {
  return dbState.available
}

export function getDbState(): DbState {
  return { ...dbState }
}
