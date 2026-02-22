import { eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { notifyResourceChange } from '~~/server/utils/notify-resource'
import { generateBridgeResponse } from './responder'
import { getAdapter } from './registry'
import type { NormalizedMessage, OutboundMessage, DeliveryResult } from './types'

/**
 * Handle an inbound message from any platform adapter.
 * Normalizes it, logs it to the database, and (in future phases)
 * routes it to the Claude agent for processing.
 */
export async function handleInboundMessage(
  bridgeId: string,
  message: NormalizedMessage
): Promise<void> {
  const db = getDb()

  // Store the inbound message
  const [stored] = await db.insert(schema.bridgeMessages)
    .values({
      bridgeId,
      direction: 'inbound',
      platform: message.platform,
      sender: message.sender,
      senderName: message.senderName,
      content: message.text,
      attachments: message.attachments ? JSON.stringify(message.attachments) : undefined,
      platformMessageId: message.platformMessageId,
      status: 'delivered'
    })
    .returning()

  notifyResourceChange({
    resource: 'bridge',
    action: 'create',
    resourceId: stored!.id,
    resourceName: `Message from ${message.senderName || message.sender} via ${message.platform}`,
    meta: { platform: message.platform, sender: message.sender, direction: 'inbound' }
  })

  // Route to Claude agent for response (fire-and-forget)
  console.log(`[bridge] Inbound from ${message.sender} via ${message.platform}: ${message.text.substring(0, 100)}`)
  void generateBridgeResponse(bridgeId, message, stored!.id).catch((error) => {
    console.error('[bridge] Failed to generate response:', error)
  })
}

/**
 * Send an outbound message through the appropriate adapter.
 * Queues it in the database and attempts delivery.
 */
export async function sendOutboundMessage(msg: OutboundMessage): Promise<DeliveryResult> {
  const db = getDb()

  // Store in queue as pending
  const [queued] = await db.insert(schema.bridgeMessages)
    .values({
      bridgeId: msg.bridgeId,
      direction: 'outbound',
      platform: msg.platform,
      sender: 'agent',
      content: msg.text,
      attachments: msg.attachments ? JSON.stringify(msg.attachments) : undefined,
      status: 'pending'
    })
    .returning()

  // Attempt delivery
  const adapter = getAdapter(msg.bridgeId)
  if (!adapter) {
    await db.update(schema.bridgeMessages)
      .set({ status: 'failed', lastError: 'No active adapter', attempts: 1 })
      .where(eq(schema.bridgeMessages.id, queued!.id))

    return { success: false, error: 'No active adapter for this bridge' }
  }

  try {
    const result = await adapter.send(msg)

    await db.update(schema.bridgeMessages)
      .set({
        status: result.success ? 'sent' : 'failed',
        platformMessageId: result.platformMessageId,
        lastError: result.error,
        attempts: 1,
        sentAt: result.success ? new Date() : undefined
      })
      .where(eq(schema.bridgeMessages.id, queued!.id))

    if (result.success) {
      notifyResourceChange({
        resource: 'bridge',
        action: 'complete',
        resourceId: queued!.id,
        resourceName: `${msg.platform} message sent`,
        meta: { platform: msg.platform, direction: 'outbound' }
      })
    } else {
      notifyResourceChange({
        resource: 'bridge',
        action: 'fail',
        resourceId: queued!.id,
        resourceName: `${msg.platform} delivery failed`,
        meta: { platform: msg.platform, error: result.error }
      })
    }

    return result
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'

    await db.update(schema.bridgeMessages)
      .set({ status: 'failed', lastError: errorMsg, attempts: 1 })
      .where(eq(schema.bridgeMessages.id, queued!.id))

    notifyResourceChange({
      resource: 'bridge',
      action: 'fail',
      resourceId: queued!.id,
      resourceName: `${msg.platform} delivery error`,
      meta: { platform: msg.platform, error: errorMsg }
    })

    return { success: false, error: errorMsg }
  }
}
