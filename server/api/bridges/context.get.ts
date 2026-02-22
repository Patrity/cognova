import { getDb } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'
import type { BridgePlatform, GoogleBridgeConfig, IMessageBridgeConfig, TelegramBridgeConfig, DiscordBridgeConfig } from '~~/shared/types'

/**
 * Returns a pre-formatted prompt section describing enabled bridges.
 * Called by the SessionStart hook to inject integration awareness into the agent.
 *
 * Returns empty string when no bridges are configured — no clutter in the prompt.
 */

const platformLabels: Record<BridgePlatform, string> = {
  telegram: 'Telegram',
  discord: 'Discord',
  imessage: 'iMessage',
  google: 'Google Suite',
  email: 'Email'
}

const allPlatforms: BridgePlatform[] = ['telegram', 'discord', 'imessage', 'google', 'email']

function formatTelegramContext(config: TelegramBridgeConfig | null, bridgeId: string): string {
  const lines = [
    'You can send and receive Telegram messages.',
    '- Incoming messages are routed to you automatically.',
    `- To send a message: use \`/bridge\` skill → \`contacts ${bridgeId}\` to find the recipient, then \`send ${bridgeId} -r <ID> -t "message"\``,
    `- To list contacts: \`/bridge\` skill → \`contacts ${bridgeId}\``
  ]
  if (config?.botUsername)
    lines.push(`- Bot username: @${config.botUsername}`)
  return lines.join('\n')
}

function formatDiscordContext(config: DiscordBridgeConfig | null, bridgeId: string): string {
  const lines = [
    'You can send and receive Discord messages.',
    `- To send: \`/bridge\` skill → \`contacts ${bridgeId}\` to find recipient, then \`send ${bridgeId} -r <ID> -t "message"\``
  ]
  const mode = config?.listenMode || 'mentions'
  if (mode === 'dm')
    lines.push('- Listening for DMs only.')
  else if (mode === 'mentions')
    lines.push('- Listening for @mentions and DMs.')
  else
    lines.push('- Listening for all messages in the configured channel.')
  return lines.join('\n')
}

function formatIMessageContext(config: IMessageBridgeConfig | null, bridgeId: string): string {
  const strategy = config?.strategy || 'imsg'
  const lines = [
    `You can send and receive iMessages (via ${strategy === 'imsg' ? 'local imsg CLI' : 'remote BlueBubbles'}).`,
    '- Incoming iMessages are routed to you automatically.'
  ]
  if (strategy === 'imsg')
    lines.push('- Send via: `imsg send "<number>" "<message>"`')
  else
    lines.push(`- To send: \`/bridge\` skill → \`contacts ${bridgeId}\` to find recipient, then \`send ${bridgeId} -r <ID> -t "message"\``)
  return lines.join('\n')
}

function formatGoogleContext(config: GoogleBridgeConfig | null): string {
  const services = config?.enabledServices || []
  const lines = ['You have access to the following Google services via `gog` CLI:']

  if (services.includes('gmail'))
    lines.push('- **Gmail**: Send and search emails via `gog gmail ...`')
  if (services.includes('calendar'))
    lines.push('- **Calendar**: View and create events via `gog calendar ...`')
  if (services.includes('drive'))
    lines.push('- **Drive**: List and upload files via `gog drive ...`')
  if (services.includes('contacts'))
    lines.push('- **Contacts**: Search contacts via `gog contacts ...`')
  if (services.includes('tasks'))
    lines.push('- **Tasks**: Manage tasks via `gog tasks ...`')

  const allGoogleServices = ['gmail', 'calendar', 'drive', 'contacts', 'tasks']
  const disabled = allGoogleServices.filter(s => !services.includes(s))
  if (disabled.length > 0)
    lines.push(`\nRestricted (not enabled): ${disabled.join(', ')}`)

  if (config?.account)
    lines.push(`\nAccount: ${config.account}`)

  return lines.join('\n')
}

function formatEmailContext(bridgeId: string): string {
  return [
    'You can send and receive email via IMAP/SMTP.',
    '- Incoming emails are routed to you automatically.',
    `- To send: \`/bridge\` skill → \`contacts ${bridgeId}\` to find recipient, then \`send ${bridgeId} -r <ID> -t "message"\``
  ].join('\n')
}

export default defineEventHandler(async (event) => {
  requireDb(event)

  const db = getDb()

  const bridges = await db.query.bridges.findMany()

  const enabledBridges = bridges.filter(b => b.enabled)

  // No bridges configured — return empty
  if (enabledBridges.length === 0 && bridges.length === 0) {
    return { data: { formatted: '', bridges: [] } }
  }

  const sections: string[] = []

  for (const bridge of enabledBridges) {
    const config = bridge.config ? JSON.parse(bridge.config) : null
    let details = ''

    switch (bridge.platform) {
      case 'telegram':
        details = formatTelegramContext(config, bridge.id)
        break
      case 'discord':
        details = formatDiscordContext(config, bridge.id)
        break
      case 'imessage':
        details = formatIMessageContext(config, bridge.id)
        break
      case 'google':
        details = formatGoogleContext(config)
        break
      case 'email':
        details = formatEmailContext(bridge.id)
        break
    }

    const status = bridge.healthStatus === 'connected' ? 'Connected' : bridge.healthStatus
    sections.push(`### ${platformLabels[bridge.platform]} (${status})\n${details}`)
  }

  // List unconfigured platforms
  const configuredPlatforms = new Set(bridges.map(b => b.platform))
  const unconfigured = allPlatforms.filter(p => !configuredPlatforms.has(p))
  const disabledBridges = bridges.filter(b => !b.enabled)

  const notAvailable: string[] = []
  for (const b of disabledBridges)
    notAvailable.push(`- ${platformLabels[b.platform]}: Disabled`)
  for (const p of unconfigured)
    notAvailable.push(`- ${platformLabels[p]}: Not configured`)

  let formatted = ''

  if (sections.length > 0) {
    formatted = `## Available Integrations\n\n${sections.join('\n\n')}`
    if (notAvailable.length > 0)
      formatted += `\n\n### Not available\n${notAvailable.join('\n')}`
  }

  return {
    data: {
      formatted,
      bridges: bridges.map(b => ({
        id: b.id,
        platform: b.platform,
        name: b.name,
        enabled: b.enabled,
        healthStatus: b.healthStatus
      }))
    }
  }
})
