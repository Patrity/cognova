import { eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { registerAdapter, getAdapter, unregisterAdapter } from './registry'
import { TelegramAdapter } from './adapters/telegram'
import { DiscordAdapter } from './adapters/discord'
import { IMessageAdapter } from './adapters/imessage'
import { GoogleAdapter } from './adapters/google'
import { EmailAdapter } from './adapters/email'
import type { TelegramBridgeConfig, DiscordBridgeConfig, IMessageBridgeConfig, GoogleBridgeConfig, EmailBridgeConfig } from '~~/shared/types'

type BridgeRow = typeof schema.bridges.$inferSelect

/**
 * Start a bridge adapter and register it.
 * Updates health status in the database.
 */
export async function startBridge(bridge: BridgeRow): Promise<void> {
  const db = getDb()
  const adapter = createAdapterForBridge(bridge)

  if (!adapter) {
    await db.update(schema.bridges)
      .set({
        healthStatus: 'error',
        healthMessage: `${bridge.platform} adapter not yet implemented`,
        lastHealthCheck: new Date()
      })
      .where(eq(schema.bridges.id, bridge.id))
    return
  }

  try {
    await adapter.start()
    registerAdapter(bridge.id, adapter)

    // Persist webhook secrets and update health
    const updateSet: Record<string, unknown> = {
      healthStatus: 'connected',
      healthMessage: null,
      lastHealthCheck: new Date()
    }

    if (adapter instanceof TelegramAdapter || adapter instanceof IMessageAdapter) {
      const existingConfig = bridge.config ? JSON.parse(bridge.config) : {}
      existingConfig.webhookSecret = adapter.secret
      updateSet.config = JSON.stringify(existingConfig)
    }

    await db.update(schema.bridges)
      .set(updateSet)
      .where(eq(schema.bridges.id, bridge.id))
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[bridge] Failed to start ${bridge.platform} adapter:`, msg)

    await db.update(schema.bridges)
      .set({
        healthStatus: 'error',
        healthMessage: msg,
        lastHealthCheck: new Date()
      })
      .where(eq(schema.bridges.id, bridge.id))
  }
}

/**
 * Stop a bridge adapter and unregister it.
 */
export async function stopBridge(bridgeId: string): Promise<void> {
  const adapter = getAdapter(bridgeId)
  if (adapter) {
    await adapter.stop()
    unregisterAdapter(bridgeId)
  }

  const db = getDb()
  await db.update(schema.bridges)
    .set({
      healthStatus: 'disconnected',
      healthMessage: null,
      lastHealthCheck: new Date()
    })
    .where(eq(schema.bridges.id, bridgeId))
}

/**
 * Factory: create the right adapter based on platform.
 */
function createAdapterForBridge(bridge: BridgeRow) {
  const config = bridge.config ? JSON.parse(bridge.config) : {}

  switch (bridge.platform) {
    case 'telegram':
      return new TelegramAdapter(
        bridge.id,
        config as TelegramBridgeConfig,
        config.webhookSecret
      )
    case 'discord':
      return new DiscordAdapter(
        bridge.id,
        config as DiscordBridgeConfig
      )
    case 'imessage':
      return new IMessageAdapter(
        bridge.id,
        config as IMessageBridgeConfig,
        config.webhookSecret
      )
    case 'google':
      return new GoogleAdapter(
        bridge.id,
        config as GoogleBridgeConfig
      )
    case 'email':
      return new EmailAdapter(
        bridge.id,
        config as EmailBridgeConfig
      )
    default:
      console.warn(`[bridge] Unknown platform: ${bridge.platform}`)
      return null
  }
}
