---
tags: []
shared: false
---
# Message Bridge

Unified system for connecting the agent to external messaging platforms (Discord, Telegram, iMessage, Email, etc). All integrations are **disabled by default** and toggled via UI settings or agent conversation.

## Architecture

```
server/
  bridge/
    types.ts              # BridgeMessage, BridgeAdapter interface
    router.ts             # Normalize incoming → agent → normalize outgoing
    queue.ts              # Outbound message queue processor
    adapters/
      discord.ts          # Bot gateway (persistent connection)
      telegram.ts         # Webhook receiver + Bot API sender
      imessage.ts         # imsg CLI or BlueBubbles REST
      google.ts           # gogcli wrapper (Gmail bridge + Calendar/Drive/etc tools)
      email.ts            # Generic IMAP idle + SMTP (non-Gmail, future)
  plugins/
    06.message-bridge.ts  # Init enabled adapters after DB ready
  api/
    bridges/
      index.get.ts        # List user's bridge configs
      index.post.ts       # Create/enable a bridge
      [id].put.ts         # Update config (enable/disable, channel mapping)
      [id].delete.ts      # Remove bridge
    webhooks/
      telegram.post.ts    # Telegram webhook receiver
      discord.post.ts     # Discord interactions receiver
      bluebubbles.post.ts # BlueBubbles webhook receiver (remote iMessage)
```

## Adapter Interface

Every adapter implements the same contract:

```typescript
interface BridgeAdapter {
  platform: BridgePlatform
  start(): Promise<void>          // Init connection/listener
  stop(): Promise<void>           // Graceful shutdown
  send(msg: OutboundMessage): Promise<DeliveryResult>
  isHealthy(): boolean            // Connection status check
}

interface BridgeMessage {
  platform: BridgePlatform
  sender: string                  // Platform-specific ID
  senderName?: string             // Display name
  text: string
  attachments?: BridgeAttachment[]
  replyTo?: string                // For threading
  channelId?: string              // Platform channel/chat ID
  raw?: unknown                   // Original platform payload
}

type BridgePlatform = 'discord' | 'telegram' | 'imessage' | 'email'
```

## Message Flow

### Incoming (platform → agent)

```
Platform message
  → Adapter normalizes to BridgeMessage
  → Router creates a conversation (or appends to existing)
  → Agent processes via Claude SDK (same as chat UI)
  → Response sent back through originating adapter
  → Notification bus broadcasts to UI
```

### Outgoing (agent → platform)

```
Agent decides to notify user (or user sends via UI)
  → Message inserted into queue table (status: pending)
  → Queue processor picks up, resolves adapter
  → Adapter sends to platform
  → Status updated (sent/failed)
  → Notification bus broadcasts delivery status
```

## Platform Details

### 1. Telegram (webhook — no extra process)

**Why first**: Zero persistent connections. Telegram POSTs to your server. Simplest possible integration.

**Setup flow**:
1. User creates bot via [@BotFather](https://t.me/BotFather), gets token
2. User stores token as secret: `TELEGRAM_BOT_TOKEN`
3. User enables Telegram bridge in settings (or asks agent to)
4. Server registers webhook URL with Telegram API: `POST https://api.telegram.org/bot<token>/setWebhook`
5. Incoming messages hit `server/api/webhooks/telegram.post.ts`

**Dependencies**: None (just HTTP calls to Telegram Bot API)

**Sending**: `POST https://api.telegram.org/bot<token>/sendMessage`

**Receiving**: Telegram pushes to our webhook endpoint

**Verification**: Compare `X-Telegram-Bot-Api-Secret-Token` header

### 2. Discord (bot gateway — Nitro plugin)

**Why second**: They already have a Discord webhook skill for sending. This adds receiving.

**Setup flow**:
1. User creates bot in Discord Developer Portal
2. User stores token as secret: `DISCORD_BOT_TOKEN`
3. User enables Discord bridge in settings
4. Nitro plugin starts discord.js client with minimal intents (GUILD_MESSAGES, DIRECT_MESSAGES)
5. Bot listens for mentions or DMs only (not all messages)

**Dependencies**: `discord.js` (well-maintained, 150M+ downloads)

**Sending**: discord.js `channel.send()` or existing webhook skill

**Receiving**: Gateway events filtered to bot mentions + DMs

**Alternative (lighter)**: Discord Interactions (slash commands) are webhook-based, no gateway needed. Could offer both: slash commands for quick queries, full bot for conversational use.

### 3. iMessage (two strategies based on deployment)

The iMessage adapter supports two backends depending on where Cognova runs:

| | `imsg` (local) | BlueBubbles (remote) |
|---|---|---|
| **Cognova runs on** | The Mac itself | Linux, Docker, any remote server |
| **iMessage access** | Direct — chat.db + AppleScript | HTTP REST API to a Mac running BlueBubbles |
| **Dependencies** | `brew install steipete/tap/imsg` | BlueBubbles server app on a separate Mac |
| **Setup complexity** | Low (macOS permissions only) | Medium (BlueBubbles app + network access/tunnel) |
| **Attachments/reactions** | Basic (text + file send) | Full (reactions, read receipts, tapbacks) |

Both backends implement the same `BridgeAdapter` interface — the rest of the system doesn't care which one is active.

#### Strategy A: `imsg` CLI (local macOS)

Best when Cognova runs directly on a Mac. [imsg](https://github.com/steipete/imsg) is a single Go binary designed for agent integration.

- Watch: `imsg watch --json` streams new messages as newline-delimited JSON
- Send: `imsg send "+1234567890" "Hello"`
- Requires: Full Disk Access (chat.db) + Automation permission (Messages.app)

**Setup flow**:
1. User installs imsg: `brew install steipete/tap/imsg`
2. User grants Full Disk Access + Automation permissions
3. User enables iMessage bridge in settings, selects "Local (imsg)" mode
4. Nitro plugin spawns `imsg watch --json` as child process
5. Adapter parses JSON lines, routes to agent

**Sending**: `child_process.execFile('imsg', ['send', recipient, text])`

**Receiving**: Parse stdout of long-running `imsg watch --json` process

**Gate**: Only available when `process.platform === 'darwin'`

#### Strategy B: BlueBubbles (remote, any platform)

Best when Cognova runs on Linux/Docker but the user has a Mac elsewhere. [BlueBubbles](https://bluebubbles.app/) runs on the Mac and exposes a [REST API](https://docs.bluebubbles.app/server) over HTTP.

- Send: `POST /api/v1/message/text`
- Receive: BlueBubbles webhook pushes to Cognova's webhook endpoint
- Full feature support: attachments, reactions, read receipts, tapbacks, group chats

**Setup flow**:
1. User installs BlueBubbles on their Mac
2. User configures BlueBubbles with a server URL (local network, Cloudflare Tunnel, or ngrok)
3. User stores BlueBubbles server URL + password as secrets: `BLUEBUBBLES_URL`, `BLUEBUBBLES_PASSWORD`
4. User enables iMessage bridge in settings, selects "Remote (BlueBubbles)" mode
5. Server registers a webhook with BlueBubbles API: `POST /api/v1/webhook` pointing to Cognova's ingress
6. Incoming messages hit `server/api/webhooks/bluebubbles.post.ts`

**Sending**: `POST {BLUEBUBBLES_URL}/api/v1/message/text` with auth header

**Receiving**: BlueBubbles pushes new-message events to our webhook

**Gate**: Available on all platforms (requires external Mac running BlueBubbles)

#### Why not the others?

| Approach | Verdict |
|----------|---------|
| [osa-imessage](https://www.npmjs.com/package/osa-imessage) | Stale, AppleScript-only receiving is flaky |
| Raw chat.db | Fragile across macOS updates, read-only, DIY everything |

### 4. Google Suite via gogcli (Gmail, Calendar, Drive, etc.)

[gogcli](https://github.com/steipete/gogcli) is a single CLI (by the same author as `imsg`) covering Gmail, Calendar, Drive, Contacts, Tasks, Sheets, Forms, Docs, and more. JSON-first output, multi-account, and a **command allowlist** (`GOG_ENABLE_COMMANDS`) for agent safety.

This serves **two purposes**:

1. **Bridge adapter** — Gmail becomes the email messaging channel (send/receive)
2. **Agent tool layer** — Calendar, Drive, Contacts, Tasks become tools the agent can use proactively ("check my calendar", "save this to Drive", "find Tony's email")

**Install**: `brew install steipete/tap/gogcli`

**Auth**: OAuth2 — user runs `gog auth credentials <file.json>` + `gog auth add user@gmail.com` once. Tokens stored in OS keyring (macOS Keychain) or encrypted file.

**Command structure**: `gog <service> <action> [flags] --json`

#### As a bridge adapter (Gmail)

**Sending**: `gog gmail send --to user@example.com --subject "Re: ..." --body "..."`

**Receiving**: `gog gmail watch` sets up Pub/Sub push notifications, or poll via `gog gmail search 'newer_than:1h' --json`

**Threading**: Gmail API supports thread IDs natively — map to Cognova conversations

#### As an agent tool layer

The agent can use `gogcli` commands as tools, gated by the allowlist:

```bash
# Calendar
gog calendar events --from today --to tomorrow --json    # "What's on my calendar?"
gog calendar create --summary "Meeting" --start "..."    # "Schedule a meeting"
gog calendar freebusy --json                             # "When am I free?"

# Drive
gog drive list --query "name contains 'report'" --json   # "Find my report"
gog drive upload ./file.pdf                              # "Save this to Drive"

# Contacts
gog contacts search "John" --json                        # "What's John's email?"

# Tasks
gog tasks list --json                                    # "What are my Google Tasks?"
gog tasks add --title "Follow up with client"            # "Add a task"
```

**Safety**: Set `GOG_ENABLE_COMMANDS` to restrict which services the agent can access. Example: `GOG_ENABLE_COMMANDS=gmail,calendar,contacts` blocks Drive/Tasks/etc.

**Configuration**: Store the allowlist in bridge config. Users toggle which Google services the agent can access from the UI.

#### Setup flow

1. User installs gogcli: `brew install steipete/tap/gogcli` (or from source on Linux)
2. User creates OAuth credentials in Google Cloud Console
3. User runs `gog auth credentials <file.json>` + `gog auth add user@gmail.com`
4. User enables Google bridge in settings
5. User selects which services to expose (Gmail, Calendar, etc.) — stored as `GOG_ENABLE_COMMANDS`
6. For Gmail bridge: server sets up polling or Pub/Sub watch for incoming emails
7. Agent tools registered for enabled services

### 5. Email (generic IMAP + SMTP — fallback)

For non-Gmail email (Outlook, ProtonMail, self-hosted, etc.).

**Approach**: `imapflow` for IMAP IDLE (push-based, no polling) + `nodemailer` for SMTP sending.

**Deferred** — `gogcli` covers Gmail users. This is for everyone else.

## Database Schema

Three new tables following existing patterns:

```typescript
// Message bridge configurations
export const bridges = pgTable('bridges', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  platform: text('platform').notNull(),       // 'discord' | 'telegram' | 'imessage'
  name: text('name').notNull(),               // User-friendly label
  enabled: boolean('enabled').default(false),  // Disabled by default
  config: text('config'),                      // JSON: channel mappings, filter rules
  secretKey: text('secret_key'),               // Reference to secrets table key name
  lastHealthCheck: timestamp('last_health_check', { withTimezone: true }),
  healthStatus: text('health_status'),         // 'connected' | 'disconnected' | 'error'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// Inbound/outbound message log
export const bridgeMessages = pgTable('bridge_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  bridgeId: uuid('bridge_id').notNull().references(() => bridges.id),
  direction: text('direction').notNull(),      // 'inbound' | 'outbound'
  platform: text('platform').notNull(),
  sender: text('sender'),                      // Platform-specific sender ID
  senderName: text('sender_name'),
  content: text('content').notNull(),
  attachments: text('attachments'),            // JSON array
  platformMessageId: text('platform_message_id'),
  conversationId: uuid('conversation_id'),     // Link to chat conversation
  status: text('status').default('pending'),   // 'pending' | 'sent' | 'delivered' | 'failed'
  attempts: integer('attempts').default(0),
  lastError: text('last_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
})
```

## Settings Integration

Add to existing `UserSettings` type:

```typescript
interface UserSettings {
  notifications: NotificationPreferences
  bridges?: {
    globalEnabled: boolean          // Master kill switch
    respondToUnknown: boolean       // Reply to messages from unknown senders?
    autoReplyMessage?: string       // "I'll get back to you" default response
    allowedPlatforms: BridgePlatform[]
  }
}
```

Individual bridge configs live in the `bridges` table, not in settings JSON. Settings only holds global preferences.

## UI

### Settings Page — Integrations Tab

New tab alongside existing Profile, Security, Notifications tabs:

```
┌─ Integrations ──────────────────────────────────┐
│                                                  │
│  Message Bridge                    [Master: Off] │
│                                                  │
│  ┌─ Telegram ─────────────────── [Disabled] ──┐  │
│  │  Status: Not configured                    │  │
│  │  [Configure]                               │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌─ Discord ──────────────────── [Disabled] ──┐  │
│  │  Status: Not configured                    │  │
│  │  [Configure]                               │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌─ iMessage ─────────────────── [Disabled] ──┐  │
│  │  Mode: (o) Local (imsg)  ( ) Remote (BB)   │  │
│  │  Status: Not configured                    │  │
│  │  [Configure]                               │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Preferences                                     │
│  Reply to unknown senders?         [Off]         │
│  Auto-reply message:               [Edit]        │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Agent Conversation

The agent should be able to manage bridges conversationally:

```
User: "Set up Telegram for me"
Agent: "I can help with that. Here's what we need:
  1. Create a Telegram bot via @BotFather
  2. Store the bot token as a secret
  3. Enable the Telegram bridge

  Do you already have a bot token, or should I walk you through creating one?"
```

This is handled through the existing skills system — a `/bridge` skill that wraps the bridge API.

## Notification Bus Integration

Add `'bridge'` to `NotificationResource` type:

```typescript
// Incoming message received
notifyResourceChange({
  resource: 'bridge',
  action: 'create',
  resourceId: messageId,
  resourceName: `Message from ${senderName} via ${platform}`,
  meta: { platform, sender, direction: 'inbound' }
})

// Outbound delivery status
notifyResourceChange({
  resource: 'bridge',
  action: 'update',
  resourceId: messageId,
  resourceName: `${platform} delivery: ${status}`,
  meta: { platform, status, attempts }
})
```

## Security Considerations

- **Webhook verification**: Every incoming webhook validates platform signatures (Telegram secret token, Discord signature)
- **Rate limiting**: Cap inbound message processing (prevent abuse from public-facing webhooks)
- **Sender allowlists**: Optional per-bridge allowlist of sender IDs
- **Secret storage**: All tokens/credentials stored encrypted via existing secrets system
- **Platform check**: iMessage local mode (`imsg`) only available on `process.platform === 'darwin'`; BlueBubbles remote mode available on all platforms
- **Google service allowlist**: `GOG_ENABLE_COMMANDS` restricts which Google services the agent can use — user controls this from UI
- **Master kill switch**: Global `bridges.globalEnabled` toggle to shut down all bridges instantly

## Agent Awareness (Critical)

The bridge is useless if the agent doesn't know it exists. When integrations are enabled/disabled, the agent's context must update dynamically — no manual CLAUDE.md editing required.

### How it works today

```
Session starts
  → SessionStart hook runs
  → Hook calls GET /api/memory/context
  → Prints memory section to stdout
  → Output becomes part of system prompt
```

### How it works with bridges

Same mechanism. The SessionStart hook additionally queries enabled bridges and injects capability instructions:

```
Session starts
  → SessionStart hook runs
  → Hook calls GET /api/memory/context          (existing)
  → Hook calls GET /api/bridges?enabled=true     (new)
  → Prints memory section to stdout              (existing)
  → Prints integration capabilities to stdout    (new)
  → Output becomes part of system prompt
```

### API endpoint

```
GET /api/bridges/context
```

Returns a pre-formatted prompt section based on enabled bridges. Example response when Telegram + Google Calendar are enabled:

```markdown
## Available Integrations

### Telegram
You can send and receive Telegram messages. Messages from Telegram users are routed to you as conversations.
- To send a message: Use the /bridge skill or the bridge API
- Incoming messages appear as new conversations tagged with [telegram]
- Bot username: @cognova_bot

### Google Suite (via gogcli)
You have access to the following Google services:
- **Gmail**: Send and search emails via `gog gmail ...`
- **Calendar**: View and create events via `gog calendar ...`

Restricted services (not enabled): Drive, Contacts, Tasks

### NOT available
- Discord: Not configured
- iMessage: Not configured
```

### When nothing is enabled

The endpoint returns nothing (or a brief note), so the agent doesn't get cluttered with irrelevant instructions about bridges it can't use.

### Update triggers

The context endpoint is hit fresh every session, so changes take effect immediately:
- User enables Telegram in settings → next session, agent knows about Telegram
- User disables Google Drive access → next session, agent no longer suggests Drive commands
- No server restart, no CLAUDE.md regeneration, no CLI re-init needed

### Agent self-service

The agent should also be able to enable/disable bridges via the `/bridge` skill:

```
User: "Can you check my calendar?"
Agent: "I don't currently have Google Calendar access. Want me to help you set it up?
        I'll need you to:
        1. Install gogcli: brew install steipete/tap/gogcli
        2. Authenticate with your Google account
        3. Enable the Calendar integration

        Should I walk you through it?"
```

The agent knows what's NOT available because the context endpoint tells it. It can suggest setup rather than silently failing.

## Implementation Order

### Phase 1: Foundation
- [ ] Database schema + migration
- [ ] Bridge types in `shared/types/`
- [ ] BridgeAdapter interface
- [ ] Bridge router (message normalization → agent → response)
- [ ] API routes (CRUD for bridge configs)
- [ ] `GET /api/bridges/context` — dynamic prompt section based on enabled bridges
- [ ] Update SessionStart hook to call `/api/bridges/context` and inject into agent prompt
- [ ] `/bridge` skill for agent self-service (list, enable, disable, setup guidance)
- [ ] Nitro plugin skeleton (`06.message-bridge.ts`)
- [ ] Settings UI — Integrations tab

### Phase 2: Telegram Adapter
- [ ] Webhook receiver endpoint
- [ ] Telegram Bot API client (send, setWebhook)
- [ ] Configuration flow (secret storage, webhook registration)
- [ ] Message normalization (Telegram → BridgeMessage)
- [ ] Conversation threading (map Telegram chat to Cognova conversation)

### Phase 3: Discord Adapter
- [ ] discord.js gateway connection in Nitro plugin
- [ ] DM + mention filtering
- [ ] Message normalization
- [ ] Graceful reconnection handling
- [ ] Optional: Discord Interactions (slash commands) as lighter alternative

### Phase 4: iMessage Adapter
- [ ] Strategy selector in config (local `imsg` vs remote BlueBubbles)
- [ ] **Local (imsg)**: Platform detection gate (`darwin` only)
- [ ] **Local (imsg)**: `imsg watch --json` child process management + JSON stream parsing
- [ ] **Local (imsg)**: Send via `imsg send`
- [ ] **Local (imsg)**: Permission check/guidance UI
- [ ] **Remote (BlueBubbles)**: REST API client (send, list chats, get messages)
- [ ] **Remote (BlueBubbles)**: Webhook receiver endpoint (`server/api/webhooks/bluebubbles.post.ts`)
- [ ] **Remote (BlueBubbles)**: Webhook registration with BlueBubbles server on enable
- [ ] **Remote (BlueBubbles)**: Connection health check (ping BlueBubbles server)
- [ ] Setup wizard that detects platform and recommends the right strategy

### Phase 5: Google Suite (gogcli)
- [ ] gogcli detection + install guidance
- [ ] OAuth setup flow (credentials + account auth)
- [ ] Gmail bridge adapter (send/receive email)
- [ ] Gmail polling or Pub/Sub watch for incoming
- [ ] Agent tool registration for enabled Google services (Calendar, Drive, Contacts, Tasks)
- [ ] Service allowlist UI (checkboxes for which services the agent can access)
- [ ] `GOG_ENABLE_COMMANDS` env var management

### Phase 6: Polish
- [ ] Bridge health monitoring dashboard
- [ ] Message delivery analytics
- [ ] `/bridge` skill for conversational management
- [ ] Retry logic with exponential backoff
- [ ] Auto-reply / away messages
- [ ] Generic IMAP/SMTP adapter for non-Gmail email

## Dependencies

```
message-bridge ──┬─► database (schema)
                 ├─► secrets (token storage)
                 ├─► settings (preferences)
                 ├─► notification-bus (real-time UI updates)
                 ├─► chat/agent (message processing)
                 └─► skills (conversational management)
```
