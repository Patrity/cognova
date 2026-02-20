import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'
import { notifyResourceChange } from '~~/server/utils/notify-resource'
import type { CreateBridgeInput } from '~~/shared/types'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const body = await readBody<CreateBridgeInput>(event)

  if (!body.platform || !body.name) {
    throw createError({
      statusCode: 400,
      message: 'Platform and name are required'
    })
  }

  const db = getDb()

  const [bridge] = await db.insert(schema.bridges)
    .values({
      platform: body.platform,
      name: body.name,
      enabled: body.enabled ?? false,
      config: body.config ? JSON.stringify(body.config) : undefined,
      secretKeys: body.secretKeys ?? [],
      createdBy: event.context.user?.id
    })
    .returning()

  notifyResourceChange({
    resource: 'bridge',
    action: 'create',
    resourceId: bridge!.id,
    resourceName: bridge!.name
  })

  return { data: bridge }
})
