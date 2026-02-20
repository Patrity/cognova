import { eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'
import { getAdapter } from '~~/server/bridge/registry'

/**
 * Check bridge health on demand.
 * Updates the health status in the database and returns it.
 */
export default defineEventHandler(async (event) => {
  requireDb(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Bridge ID is required' })
  }

  const db = getDb()

  const bridge = await db.query.bridges.findFirst({
    where: eq(schema.bridges.id, id)
  })

  if (!bridge) {
    throw createError({ statusCode: 404, message: 'Bridge not found' })
  }

  const adapter = getAdapter(id)
  const now = new Date()

  if (!bridge.enabled) {
    return {
      data: {
        healthStatus: 'disconnected',
        healthMessage: 'Bridge is disabled',
        lastHealthCheck: now
      }
    }
  }

  if (!adapter) {
    await db.update(schema.bridges)
      .set({
        healthStatus: 'disconnected',
        healthMessage: 'No active adapter',
        lastHealthCheck: now
      })
      .where(eq(schema.bridges.id, id))

    return {
      data: {
        healthStatus: 'disconnected',
        healthMessage: 'No active adapter',
        lastHealthCheck: now
      }
    }
  }

  const healthy = adapter.isHealthy()
  const status = healthy ? 'connected' : 'error'
  const message = healthy ? null : 'Adapter reports unhealthy'

  await db.update(schema.bridges)
    .set({
      healthStatus: status,
      healthMessage: message,
      lastHealthCheck: now
    })
    .where(eq(schema.bridges.id, id))

  return {
    data: {
      healthStatus: status,
      healthMessage: message,
      lastHealthCheck: now
    }
  }
})
