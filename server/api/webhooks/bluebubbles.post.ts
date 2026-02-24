import { getAdapterByPlatform } from '~~/server/bridge/registry'
import type { IMessageAdapter, BlueBubblesWebhookEvent } from '~~/server/bridge/adapters/imessage'

/**
 * BlueBubbles webhook receiver.
 * BlueBubbles server pushes new-message events here.
 */
export default defineEventHandler(async (event) => {
  const entry = getAdapterByPlatform('imessage')
  if (!entry) {
    throw createError({ statusCode: 404, message: 'iMessage bridge not active' })
  }

  const adapter = entry.adapter as IMessageAdapter

  // Validate webhook secret
  const query = getQuery(event)
  const providedSecret = query.secret as string | undefined
  if (!providedSecret || providedSecret !== adapter.secret) {
    throw createError({ statusCode: 403, message: 'Invalid webhook secret' })
  }

  const body = await readBody<BlueBubblesWebhookEvent>(event)

  // Process asynchronously — return 200 quickly
  void adapter.handleWebhook(body).catch((error) => {
    console.error('[bluebubbles webhook] Error processing event:', error)
  })

  return { ok: true }
})
