import { eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'
import { notifyResourceChange } from '~~/server/utils/notify-resource'
import { startBridge, stopBridge } from '~~/server/bridge/lifecycle'
import type { UpdateBridgeInput } from '~~/shared/types'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Bridge ID is required' })
  }

  const body = await readBody<UpdateBridgeInput>(event)
  const db = getDb()

  const existing = await db.query.bridges.findFirst({
    where: eq(schema.bridges.id, id)
  })

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Bridge not found' })
  }

  const [bridge] = await db.update(schema.bridges)
    .set({
      ...body.name !== undefined && { name: body.name },
      ...body.enabled !== undefined && { enabled: body.enabled },
      ...body.config !== undefined && { config: JSON.stringify(body.config) },
      ...body.secretKeys !== undefined && { secretKeys: body.secretKeys },
      updatedAt: new Date()
    })
    .where(eq(schema.bridges.id, id))
    .returning()

  // Start/stop adapter when enabled state changes
  if (body.enabled !== undefined && body.enabled !== existing.enabled) {
    if (body.enabled)
      await startBridge(bridge!)
    else
      await stopBridge(bridge!.id)
  }

  notifyResourceChange({
    resource: 'bridge',
    action: 'edit',
    resourceId: id,
    resourceName: bridge!.name
  })

  return { data: bridge }
})
