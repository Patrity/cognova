import { eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'
import { sendOutboundMessage } from '~~/server/bridge/router'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, message: 'Bridge ID is required' })

  const db = getDb()
  const bridge = await db.query.bridges.findFirst({
    where: eq(schema.bridges.id, id)
  })

  if (!bridge)
    throw createError({ statusCode: 404, message: 'Bridge not found' })
  if (!bridge.enabled)
    throw createError({ statusCode: 400, message: 'Bridge is not enabled' })

  const body = await readBody<{ recipient?: string, text?: string, replyToMessageId?: string }>(event)

  if (!body?.recipient || !body?.text)
    throw createError({ statusCode: 400, message: 'recipient and text are required' })

  const result = await sendOutboundMessage({
    bridgeId: id,
    platform: bridge.platform,
    recipient: body.recipient,
    text: body.text,
    replyToMessageId: body.replyToMessageId
  })

  if (!result.success)
    throw createError({ statusCode: 502, message: result.error || 'Failed to send message' })

  return { data: result }
})
