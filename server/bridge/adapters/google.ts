import { execFile } from 'child_process'
import { promisify } from 'util'
import type { BridgeAdapter, OutboundMessage, DeliveryResult, NormalizedMessage } from '../types'
import type { GoogleBridgeConfig } from '~~/shared/types'
import { handleInboundMessage } from '../router'

const execFileAsync = promisify(execFile)

const POLL_INTERVAL_MS = 60_000

/**
 * Google Suite adapter using gogcli.
 *
 * Serves two purposes:
 * 1. Bridge adapter — Gmail becomes the email messaging channel (send/receive)
 * 2. Agent tool layer — Calendar, Drive, Contacts, Tasks available as agent tools
 *
 * Gmail receiving is poll-based: periodically runs `gog gmail search` for new messages.
 * Sending uses `gog gmail send`.
 */
export class GoogleAdapter implements BridgeAdapter {
  readonly platform = 'google' as const

  private bridgeId: string
  private config: GoogleBridgeConfig
  private healthy = false
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private lastPollTime: Date = new Date()

  constructor(bridgeId: string, config: GoogleBridgeConfig) {
    this.bridgeId = bridgeId
    this.config = config
  }

  async start(): Promise<void> {
    // Verify gogcli is installed
    try {
      await execFileAsync('which', ['gog'])
    } catch {
      throw new Error('gogcli not found. Install with: brew install steipete/tap/gogcli')
    }

    // Verify auth by listing accounts
    try {
      const { stdout } = await execFileAsync('gog', ['auth', 'list', '--json'])
      const accounts = JSON.parse(stdout)
      if (!Array.isArray(accounts) || accounts.length === 0) {
        throw new Error('No Google accounts authenticated. Run: gog auth add <email>')
      }
      console.log(`[google] Authenticated accounts: ${accounts.length}`)
    } catch (error) {
      if (error instanceof Error && error.message.includes('No Google accounts')) {
        throw error
      }
      throw new Error(`gogcli auth check failed: ${error instanceof Error ? error.message : 'unknown'}`)
    }

    // Start Gmail polling if gmail is an enabled service
    if (this.isServiceEnabled('gmail')) {
      this.lastPollTime = new Date()
      this.pollTimer = setInterval(() => {
        void this.pollGmail().catch((err) => {
          console.error('[google] Gmail poll error:', err)
        })
      }, POLL_INTERVAL_MS)

      console.log('[google] Gmail polling started')
    }

    this.healthy = true
    console.log(`[google] Adapter started (services: ${this.config.enabledServices.join(', ')})`)
  }

  async stop(): Promise<void> {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    this.healthy = false
    console.log('[google] Adapter stopped')
  }

  async send(msg: OutboundMessage): Promise<DeliveryResult> {
    if (!this.isServiceEnabled('gmail')) {
      return { success: false, error: 'Gmail service not enabled' }
    }

    try {
      const args = [
        'gmail', 'send',
        '--to', msg.recipient,
        '--body', msg.text
      ]

      // If replying, include subject with Re: prefix
      if (msg.replyToMessageId)
        args.push('--thread-id', msg.replyToMessageId)

      if (this.config.account)
        args.push('--account', this.config.account)

      const { stdout } = await execFileAsync('gog', args)
      const result = JSON.parse(stdout)

      return {
        success: true,
        platformMessageId: result.id || result.threadId
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Send failed'
      }
    }
  }

  isHealthy(): boolean {
    return this.healthy
  }

  /**
   * Execute a gogcli command for agent tool use.
   * Only allows commands for enabled services.
   */
  async executeCommand(service: string, args: string[]): Promise<{ success: boolean, output?: string, error?: string }> {
    if (!this.isServiceEnabled(service)) {
      return { success: false, error: `Service "${service}" is not enabled` }
    }

    try {
      const fullArgs = [service, ...args, '--json']
      if (this.config.account)
        fullArgs.push('--account', this.config.account)

      const { stdout } = await execFileAsync('gog', fullArgs, { timeout: 30_000 })
      return { success: true, output: stdout }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Command failed'
      }
    }
  }

  /**
   * Get list of enabled services for agent awareness.
   */
  getEnabledServices(): string[] {
    return [...this.config.enabledServices]
  }

  // ─── Private helpers ───────────────────────────

  private isServiceEnabled(service: string): boolean {
    return this.config.enabledServices.includes(service)
  }

  private async pollGmail(): Promise<void> {
    try {
      const sinceMinutes = Math.ceil((Date.now() - this.lastPollTime.getTime()) / 60_000) + 1
      const args = [
        'gmail', 'search',
        `newer_than:${sinceMinutes}m`,
        '--json'
      ]

      if (this.config.account)
        args.push('--account', this.config.account)

      const { stdout } = await execFileAsync('gog', args, { timeout: 15_000 })
      this.lastPollTime = new Date()

      if (!stdout.trim()) return

      const messages = JSON.parse(stdout)
      if (!Array.isArray(messages)) return

      for (const msg of messages) {
        // Skip sent messages
        if (msg.labelIds?.includes('SENT')) continue

        const normalized: NormalizedMessage = {
          platform: 'google',
          sender: msg.from || msg.sender || 'unknown',
          senderName: msg.fromName || msg.from,
          text: msg.snippet || msg.body || '',
          channelId: msg.threadId,
          platformMessageId: msg.id,
          raw: msg
        }

        if (msg.attachments?.length) {
          normalized.attachments = msg.attachments.map((att: GmailAttachment) => ({
            type: 'file' as const,
            filename: att.filename,
            mimeType: att.mimeType,
            size: att.size
          }))
        }

        await handleInboundMessage(this.bridgeId, normalized)
      }
    } catch (error) {
      // Silently handle poll errors — will retry next interval
      if (process.env.DEBUG)
        console.error('[google] Poll error:', error)
    }
  }
}

interface GmailAttachment {
  filename?: string
  mimeType?: string
  size?: number
}
