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
  const body = await readBody<BlueBubblesWebhookEvent>(event)

  // Process asynchronously — return 200 quickly
  void adapter.handleWebhook(body).catch((error) => {
    console.error('[bluebubbles webhook] Error processing event:', error)
  })

  return { ok: true }
})
