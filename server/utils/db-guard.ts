import type { H3Event } from 'h3'
import { isDbAvailable } from './db-state'

export function requireDb(_event: H3Event) {
  if (!isDbAvailable()) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Database Unavailable',
      message: 'Database features are currently disabled. Configure DATABASE_URL to enable.'
    })
  }
}
