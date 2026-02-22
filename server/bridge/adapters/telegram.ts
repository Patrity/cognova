import { randomBytes } from 'crypto'
import type { BridgeAdapter, OutboundMessage, DeliveryResult, NormalizedMessage } from '../types'
import type { TelegramBridgeConfig } from '~~/shared/types'
import { getSecretValue } from '~~/server/utils/get-secret'
import { handleInboundMessage } from '../router'

const TELEGRAM_API = 'https://api.telegram.org'

/**
 * Telegram Bot API types (subset of what we need)
 */
interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  edited_message?: TelegramMessage
}

interface TelegramMessage {
  message_id: number
  from?: {
    id: number
    is_bot: boolean
    first_name: string
    last_name?: string
    username?: string
  }
  chat: {
    id: number
    type: 'private' | 'group' | 'supergroup' | 'channel'
    title?: string
    username?: string
    first_name?: string
  }
  date: number
  text?: string
  photo?: TelegramPhotoSize[]
  document?: TelegramDocument
  caption?: string
  reply_to_message?: TelegramMessage
}

interface TelegramPhotoSize {
  file_id: string
  file_unique_id: string
  width: number
  height: number
  file_size?: number
}

interface TelegramDocument {
  file_id: string
  file_unique_id: string
  file_name?: string
  mime_type?: string
  file_size?: number
}

/**
 * Telegram adapter supporting both webhook and long-polling modes.
 *
 * - If a public APP_URL is configured, registers a webhook with Telegram.
 * - Otherwise, falls back to long-polling via getUpdates.
 *
 * Messages are sent via the Bot API sendMessage endpoint.
 */
export class TelegramAdapter implements BridgeAdapter {
  readonly platform = 'telegram' as const

  private bridgeId: string
  private config: TelegramBridgeConfig
  private botToken: string | null = null
  private webhookSecret: string
  private healthy = false
  private polling = false
  private pollAbort: AbortController | null = null
  private pollOffset = 0

  constructor(
    bridgeId: string,
    config: TelegramBridgeConfig,
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
    // Fetch bot token from secrets store
    this.botToken = await getSecretValue('TELEGRAM_BOT_TOKEN')
    if (!this.botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN secret not found. Add it in Settings → Secrets.')
    }

    // Also check for APP_URL in secrets store (set via Settings → App)
    const appUrlSecret = await getSecretValue('APP_URL')
    if (appUrlSecret && !process.env.APP_URL)
      process.env.APP_URL = appUrlSecret

    // Validate token by calling getMe
    const me = await this.apiCall('getMe')
    if (!me.ok) {
      throw new Error(`Invalid Telegram bot token: ${me.description || 'unknown error'}`)
    }

    // Store bot username if not set
    if (!this.config.botUsername && me.result?.username) {
      this.config.botUsername = me.result.username as string
    }

    console.log(`[telegram] Bot @${me.result?.username} authenticated`)

    // Register webhook or start polling
    const webhookUrl = this.getWebhookUrl()
    if (webhookUrl) {
      const setResult = await this.apiCall('setWebhook', {
        url: webhookUrl,
        secret_token: this.webhookSecret,
        allowed_updates: ['message', 'edited_message']
      })

      if (!setResult.ok) {
        throw new Error(`Failed to set webhook: ${setResult.description || 'unknown error'}`)
      }

      console.log(`[telegram] Webhook registered: ${webhookUrl}`)
    } else {
      // Delete any existing webhook before polling (Telegram requires this)
      await this.apiCall('deleteWebhook')
      console.log('[telegram] No public URL configured — starting long-polling')
      this.startPolling()
    }

    this.healthy = true
  }

  async stop(): Promise<void> {
    // Stop polling loop if running
    this.stopPolling()

    if (this.botToken) {
      try {
        await this.apiCall('deleteWebhook')
        console.log('[telegram] Webhook removed')
      } catch {
        // Best effort — don't fail shutdown
      }
    }
    this.healthy = false
    this.botToken = null
  }

  async send(msg: OutboundMessage): Promise<DeliveryResult> {
    if (!this.botToken) {
      return { success: false, error: 'Bot token not available' }
    }

    try {
      const result = await this.apiCall('sendMessage', {
        chat_id: msg.recipient,
        text: msg.text,
        parse_mode: 'Markdown',
        ...(msg.replyToMessageId && {
          reply_parameters: { message_id: parseInt(msg.replyToMessageId) }
        })
      })

      if (!result.ok) {
        return { success: false, error: result.description || 'Send failed' }
      }

      return {
        success: true,
        platformMessageId: String(result.result?.message_id)
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown send error'
      }
    }
  }

  isHealthy(): boolean {
    return this.healthy
  }

  /**
   * Handle an incoming webhook update from Telegram.
   * Called by the webhook API route after header verification.
   */
  async handleUpdate(update: TelegramUpdate): Promise<void> {
    const message = update.message || update.edited_message
    if (!message) return

    // Skip bot messages
    if (message.from?.is_bot) return

    // If allowedChatIds is configured, filter
    if (this.config.allowedChatIds?.length) {
      if (!this.config.allowedChatIds.includes(String(message.chat.id)))
        return
    }

    const text = message.text || message.caption || ''
    if (!text) return

    const normalized: NormalizedMessage = {
      platform: 'telegram',
      sender: String(message.from?.id || message.chat.id),
      senderName: formatTelegramName(message.from),
      text,
      channelId: String(message.chat.id),
      platformMessageId: String(message.message_id),
      replyTo: message.reply_to_message
        ? String(message.reply_to_message.message_id)
        : undefined,
      raw: update
    }

    // Handle photo attachments
    if (message.photo?.length) {
      const largest = message.photo[message.photo.length - 1]
      normalized.attachments = [{
        type: 'image',
        filename: `photo_${largest!.file_unique_id}.jpg`,
        url: await this.getFileUrl(largest!.file_id)
      }]
    }

    // Handle document attachments
    if (message.document) {
      normalized.attachments = [{
        type: 'file',
        filename: message.document.file_name,
        mimeType: message.document.mime_type,
        size: message.document.file_size,
        url: await this.getFileUrl(message.document.file_id)
      }]
    }

    await handleInboundMessage(this.bridgeId, normalized)
  }

  /**
   * Verify the X-Telegram-Bot-Api-Secret-Token header.
   */
  verifySecret(headerValue: string | undefined): boolean {
    return headerValue === this.webhookSecret
  }

  // ─── Polling ─────────────────────────────────────

  private startPolling(): void {
    this.polling = true
    this.pollAbort = new AbortController()
    void this.pollLoop()
  }

  private stopPolling(): void {
    this.polling = false
    if (this.pollAbort) {
      this.pollAbort.abort()
      this.pollAbort = null
    }
  }

  private async pollLoop(): Promise<void> {
    while (this.polling && this.botToken) {
      try {
        const result = await this.apiCall('getUpdates', {
          offset: this.pollOffset,
          timeout: 30,
          allowed_updates: ['message', 'edited_message']
        }, this.pollAbort?.signal)

        if (!this.polling) break

        if (result.ok && Array.isArray(result.result)) {
          for (const update of result.result as TelegramUpdate[]) {
            this.pollOffset = update.update_id + 1
            await this.handleUpdate(update).catch((error: unknown) => {
              console.error('[telegram] Error handling polled update:', error)
            })
          }
        } else if (!result.ok) {
          console.error('[telegram] Polling error:', result.description)
          // Back off on error to avoid hammering the API
          await sleep(5000)
        }
      } catch (error) {
        if (!this.polling) break
        // Network error — back off and retry
        console.error('[telegram] Poll network error:', error instanceof Error ? error.message : error)
        await sleep(5000)
      }
    }
  }

  // ─── Private helpers ───────────────────────────

  private getWebhookUrl(): string | null {
    // Check for explicit webhook URL in config
    const config = this.config as TelegramBridgeConfig & { webhookUrl?: string }
    if (config.webhookUrl) return config.webhookUrl

    // Check environment variable
    const baseUrl = process.env.NUXT_PUBLIC_URL || process.env.APP_URL
    if (baseUrl)
      return `${baseUrl.replace(/\/$/, '')}/api/webhooks/telegram`

    return null
  }

  private async apiCall(
    method: string,
    body?: Record<string, unknown>,
    signal?: AbortSignal
  ): Promise<TelegramApiResponse> {
    const url = `${TELEGRAM_API}/bot${this.botToken}/${method}`

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        signal
      })

      return await response.json() as TelegramApiResponse
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError')
        return { ok: false, description: 'Request aborted' }
      return {
        ok: false,
        description: error instanceof Error ? error.message : 'Network error'
      }
    }
  }

  private async getFileUrl(fileId: string): Promise<string | undefined> {
    const result = await this.apiCall('getFile', { file_id: fileId })
    if (result.ok && result.result?.file_path)
      return `${TELEGRAM_API}/file/bot${this.botToken}/${result.result.file_path}`
    return undefined
  }
}

interface TelegramApiResponse {
  ok: boolean
  description?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result?: any
}

function formatTelegramName(from?: TelegramMessage['from']): string {
  if (!from) return 'Unknown'
  const parts = [from.first_name]
  if (from.last_name) parts.push(from.last_name)
  return parts.join(' ')
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
