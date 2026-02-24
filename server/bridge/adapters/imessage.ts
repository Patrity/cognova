import { randomBytes } from 'crypto'
import type { BridgeAdapter, OutboundMessage, DeliveryResult, NormalizedMessage } from '../types'
import type { IMessageBridgeConfig } from '~~/shared/types'
import { getSecretValue } from '~~/server/utils/get-secret'
import { handleInboundMessage } from '../router'

/**
 * iMessage adapter using BlueBubbles server.
 *
 * Communicates with a BlueBubbles server running on a Mac via its REST API.
 * Receives messages via webhook push.
 *
 * Setup:
 * 1. Install BlueBubbles on your Mac
 * 2. Configure it to allow API access
 * 3. Add BLUEBUBBLES_PASSWORD secret in Cognova settings
 * 4. Set blueBubblesUrl in bridge config (or BLUEBUBBLES_URL secret)
 */
export class IMessageAdapter implements BridgeAdapter {
  readonly platform = 'imessage' as const

  private bridgeId: string
  private config: IMessageBridgeConfig
  private healthy = false
  private bbUrl: string | null = null
  private bbPassword: string | null = null
  private webhookSecret: string

  constructor(
    bridgeId: string,
    config: IMessageBridgeConfig,
    webhookSecret?: string
  ) {
    this.bridgeId = bridgeId
    this.config = config
    this.webhookSecret = webhookSecret || randomBytes(32).toString('hex')
  }

  get secret(): string {
    return this.webhookSecret
  }

  async start(): Promise<void> {
    await this.startBlueBubbles()
  }

  async stop(): Promise<void> {
    await this.stopBlueBubbles()
    this.healthy = false
  }

  async send(msg: OutboundMessage): Promise<DeliveryResult> {
    return this.sendBlueBubbles(msg)
  }

  isHealthy(): boolean {
    return this.healthy
  }

  /**
   * Handle an incoming BlueBubbles webhook event.
   * Called by the webhook API route.
   */
  async handleWebhook(event: BlueBubblesWebhookEvent): Promise<void> {
    if (event.type !== 'new-message') return

    const data = event.data
    if (!data || data.isFromMe) return

    const sender = data.handle?.address || data.handle?.id || 'unknown'

    // Filter by allowed numbers
    if (this.config.allowedNumbers?.length) {
      const normalized = sender.replace(/[\s\-()]/g, '')
      if (!this.config.allowedNumbers.some(n => normalized.includes(n.replace(/[\s\-()]/g, ''))))
        return
    }

    const normalized: NormalizedMessage = {
      platform: 'imessage',
      sender,
      senderName: data.handle?.address || sender,
      text: data.text || '',
      channelId: data.chatGuid,
      platformMessageId: data.guid,
      raw: event
    }

    if (data.attachments?.length) {
      normalized.attachments = data.attachments.map((att: BlueBubblesAttachment) => ({
        type: att.mimeType?.startsWith('image/')
          ? 'image' as const
          : att.mimeType?.startsWith('video/')
            ? 'video' as const
            : att.mimeType?.startsWith('audio/')
              ? 'audio' as const
              : 'file' as const,
        filename: att.transferName,
        mimeType: att.mimeType,
        size: att.totalBytes
      }))
    }

    await handleInboundMessage(this.bridgeId, normalized)
  }

  // ─── BlueBubbles ──────────────────────

  private async startBlueBubbles(): Promise<void> {
    this.bbUrl = this.config.blueBubblesUrl || await getSecretValue('BLUEBUBBLES_URL')
    this.bbPassword = await getSecretValue('BLUEBUBBLES_PASSWORD')

    if (!this.bbUrl) {
      throw new Error('BlueBubbles URL not configured. Set it in bridge config or add BLUEBUBBLES_URL secret.')
    }
    if (!this.bbPassword) {
      throw new Error('BLUEBUBBLES_PASSWORD secret not found. Add it in Settings → Secrets.')
    }

    // Test connection by pinging the server
    const pingUrl = `${this.bbUrl}/api/v1/ping?password=${encodeURIComponent(this.bbPassword)}`
    const pingResp = await fetch(pingUrl)
    if (!pingResp.ok) {
      throw new Error(`BlueBubbles server not reachable: ${pingResp.status}`)
    }

    // Register webhook for incoming messages
    const webhookUrl = this.getWebhookUrl()
    if (webhookUrl) {
      await this.registerBBWebhook(webhookUrl)
    } else {
      console.log('[imessage] No webhook URL configured for BlueBubbles — manual setup needed')
    }

    this.healthy = true
    console.log(`[imessage] BlueBubbles connected to ${this.bbUrl}`)
  }

  private async stopBlueBubbles(): Promise<void> {
    // Best-effort webhook cleanup
    this.bbUrl = null
    this.bbPassword = null
    console.log('[imessage] BlueBubbles disconnected')
  }

  private async sendBlueBubbles(msg: OutboundMessage): Promise<DeliveryResult> {
    if (!this.bbUrl || !this.bbPassword) {
      return { success: false, error: 'BlueBubbles not connected' }
    }

    try {
      // Format chatGuid if recipient is a bare phone number or email
      const chatGuid = msg.recipient.includes(';')
        ? msg.recipient
        : `iMessage;-;${msg.recipient.startsWith('+') ? msg.recipient : `+${msg.recipient}`}`

      const resp = await fetch(`${this.bbUrl}/api/v1/message/text?password=${encodeURIComponent(this.bbPassword)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatGuid,
          tempGuid: `temp-${randomBytes(16).toString('hex')}`,
          message: msg.text
        })
      })

      if (!resp.ok) {
        const body = await resp.text()
        return { success: false, error: `BlueBubbles send failed: ${resp.status} ${body.substring(0, 200)}` }
      }

      const data = await resp.json() as { data?: { guid?: string } }
      return {
        success: true,
        platformMessageId: data.data?.guid
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private getWebhookUrl(): string | null {
    const baseUrl = process.env.NUXT_PUBLIC_URL || process.env.APP_URL
    if (baseUrl)
      return `${baseUrl.replace(/\/$/, '')}/api/webhooks/bluebubbles?secret=${this.webhookSecret}`
    return null
  }

  private async registerBBWebhook(url: string): Promise<void> {
    if (!this.bbUrl || !this.bbPassword) return

    try {
      const resp = await fetch(`${this.bbUrl}/api/v1/webhook?password=${encodeURIComponent(this.bbPassword)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          events: ['new-message']
        })
      })

      if (!resp.ok) {
        const body = await resp.text()
        console.warn(`[imessage] Failed to register BlueBubbles webhook: ${resp.status} ${body.substring(0, 200)}`)
        return
      }

      console.log(`[imessage] BlueBubbles webhook registered: ${url}`)
    } catch (error) {
      console.warn('[imessage] Failed to register BlueBubbles webhook:', error)
    }
  }
}

// ─── Types ─────────────────────────────────────

interface BlueBubblesWebhookEvent {
  type: string
  data?: {
    guid?: string
    text?: string
    isFromMe?: boolean
    chatGuid?: string
    handle?: {
      id?: string
      address?: string
    }
    attachments?: BlueBubblesAttachment[]
  }
}

interface BlueBubblesAttachment {
  transferName?: string
  mimeType?: string
  totalBytes?: number
}

export type { BlueBubblesWebhookEvent }
