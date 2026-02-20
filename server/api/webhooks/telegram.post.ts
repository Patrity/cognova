import { getAdapterByPlatform } from '~~/server/bridge/registry'
import type { TelegramAdapter } from '~~/server/bridge/adapters/telegram'

/**
 * Telegram webhook receiver.
 * Telegram POSTs updates here after setWebhook is called.
 *
 * Verification: Telegram sends X-Telegram-Bot-Api-Secret-Token header
 * which must match the secret we registered with setWebhook.
 */
export default defineEventHandler(async (event) => {
  const entry = getAdapterByPlatform('telegram')
  if (!entry) {
    throw createError({ statusCode: 404, message: 'Telegram bridge not active' })
  }

  const adapter = entry.adapter as TelegramAdapter

  // Verify the secret token header
  const secretHeader = getHeader(event, 'x-telegram-bot-api-secret-token')
  if (!adapter.verifySecret(secretHeader)) {
    throw createError({ statusCode: 401, message: 'Invalid secret token' })
  }

  const body = await readBody(event)

  // Process asynchronously — Telegram wants a 200 response quickly
  // Using void + catch to not block the response
  void adapter.handleUpdate(body).catch((error) => {
    console.error('[telegram webhook] Error processing update:', error)
  })

  return { ok: true }
})
