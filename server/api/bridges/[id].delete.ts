import { eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'
import { notifyResourceChange } from '~~/server/utils/notify-resource'
import { getAdapter, unregisterAdapter } from '~~/server/bridge/registry'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Bridge ID is required' })
  }

  const db = getDb()

  // Stop adapter if running
  const adapter = getAdapter(id)
  if (adapter) {
    await adapter.stop()
    unregisterAdapter(id)
  }

  // Delete bridge (messages will cascade delete)
  const [deleted] = await db.delete(schema.bridges)
    .where(eq(schema.bridges.id, id))
    .returning()

  if (!deleted) {
    throw createError({ statusCode: 404, message: 'Bridge not found' })
  }

  notifyResourceChange({
    resource: 'bridge',
    action: 'delete',
    resourceId: id,
    resourceName: deleted.name
  })

  return { data: deleted }
})
