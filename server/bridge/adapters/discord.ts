import { Client, GatewayIntentBits, Events, Partials } from 'discord.js'
import type { Message as DiscordMessage } from 'discord.js'
import type { BridgeAdapter, OutboundMessage, DeliveryResult, NormalizedMessage } from '../types'
import type { DiscordBridgeConfig } from '~~/shared/types'
import { getSecretValue } from '~~/server/utils/get-secret'
import { handleInboundMessage } from '../router'

/**
 * Discord adapter using discord.js gateway connection.
 *
 * Connects to Discord as a bot, listens for messages matching the configured
 * listen mode (mentions only, DMs only, or all messages in a specific channel).
 */
export class DiscordAdapter implements BridgeAdapter {
  readonly platform = 'discord' as const

  private bridgeId: string
  private config: DiscordBridgeConfig
  private client: Client | null = null
  private healthy = false
  private botUserId: string | null = null

  constructor(bridgeId: string, config: DiscordBridgeConfig) {
    this.bridgeId = bridgeId
    this.config = config
  }

  async start(): Promise<void> {
    const token = await getSecretValue('DISCORD_BOT_TOKEN')
    if (!token) {
      throw new Error('DISCORD_BOT_TOKEN secret not found. Add it in Settings → Secrets.')
    }

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
      ],
      partials: [Partials.Channel]
    })

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Discord login timed out after 30s'))
      }, 30_000)

      this.client!.once(Events.ClientReady, (readyClient) => {
        clearTimeout(timeout)
        this.botUserId = readyClient.user.id
        this.healthy = true
        console.log(`[discord] Bot ${readyClient.user.tag} connected`)
        resolve()
      })

      this.client!.on(Events.MessageCreate, (msg) => {
        void this.onMessage(msg).catch((error) => {
          console.error('[discord] Error handling message:', error)
        })
      })

      this.client!.on(Events.Error, (error) => {
        console.error('[discord] Client error:', error)
        this.healthy = false
      })

      this.client!.login(token).catch((error) => {
        clearTimeout(timeout)
        reject(new Error(`Discord login failed: ${error instanceof Error ? error.message : 'unknown'}`))
      })
    })
  }

  async stop(): Promise<void> {
    if (this.client) {
      this.client.destroy()
      this.client = null
    }
    this.healthy = false
    this.botUserId = null
    console.log('[discord] Bot disconnected')
  }

  async send(msg: OutboundMessage): Promise<DeliveryResult> {
    if (!this.client) {
      return { success: false, error: 'Discord client not connected' }
    }

    try {
      const channel = await this.client.channels.fetch(msg.recipient)
      if (!channel || !('send' in channel)) {
        return { success: false, error: `Channel ${msg.recipient} not found or not text-based` }
      }

      const sent = await (channel as { send: (content: string) => Promise<{ id: string }> }).send(msg.text)
      return { success: true, platformMessageId: sent.id }
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

  // ─── Private helpers ───────────────────────────

  private async onMessage(msg: DiscordMessage): Promise<void> {
    // Ignore our own messages
    if (msg.author.id === this.botUserId) return
    // Ignore other bots
    if (msg.author.bot) return

    const isDM = !msg.guild
    const isMention = msg.mentions.users.has(this.botUserId!)

    // Apply listen mode filter
    switch (this.config.listenMode) {
      case 'dm':
        if (!isDM) return
        break
      case 'mentions':
        if (!isDM && !isMention) return
        break
      case 'all':
        // If channelId is configured, only listen to that channel
        if (this.config.channelId && msg.channel.id !== this.config.channelId)
          return
        // If guildId is configured, only listen to that guild
        if (this.config.guildId && msg.guild?.id !== this.config.guildId)
          return
        break
    }

    // Strip bot mention from the message text
    let text = msg.content
    if (isMention && this.botUserId)
      text = text.replace(new RegExp(`<@!?${this.botUserId}>\\s*`), '').trim()

    if (!text) return

    const normalized: NormalizedMessage = {
      platform: 'discord',
      sender: msg.author.id,
      senderName: msg.author.displayName || msg.author.username,
      text,
      channelId: msg.channel.id,
      platformMessageId: msg.id,
      replyTo: msg.reference?.messageId,
      raw: {
        guildId: msg.guild?.id,
        guildName: msg.guild?.name,
        channelName: 'name' in msg.channel ? msg.channel.name : 'DM'
      }
    }

    // Handle attachments
    if (msg.attachments.size > 0) {
      normalized.attachments = msg.attachments.map(att => ({
        type: att.contentType?.startsWith('image/')
          ? 'image' as const
          : att.contentType?.startsWith('audio/')
            ? 'audio' as const
            : att.contentType?.startsWith('video/')
              ? 'video' as const
              : 'file' as const,
        url: att.url,
        filename: att.name ?? undefined,
        mimeType: att.contentType ?? undefined,
        size: att.size
      }))
    }

    await handleInboundMessage(this.bridgeId, normalized)
  }
}
