---
name: bridge
description: Manage message bridge integrations (Telegram, Discord, iMessage, Google Suite, Email). List, enable, disable, and configure platform connections.
allowed-tools: Bash, Read
metadata:
  version: "1.0.0"
  requires-secrets: []
  author: Cognova
  repository: ""
  installed-from: ""
---

# Message Bridge Skill

Manage external platform integrations for the message bridge system.

## Commands

### List all bridges

```bash
python3 ~/.claude/skills/bridge/bridge.py list
```

Shows all configured bridges with their platform, status, and health.

### Get bridge details

```bash
python3 ~/.claude/skills/bridge/bridge.py get <BRIDGE_ID>
```

Shows detailed configuration for a specific bridge.

### Create a bridge

```bash
python3 ~/.claude/skills/bridge/bridge.py create --platform <PLATFORM> --name <NAME> [--enabled]
```

Creates a new bridge integration. Platforms: `telegram`, `discord`, `imessage`, `google`, `email`.

### Enable/disable a bridge

```bash
python3 ~/.claude/skills/bridge/bridge.py enable <BRIDGE_ID>
python3 ~/.claude/skills/bridge/bridge.py disable <BRIDGE_ID>
```

### Update bridge config

```bash
python3 ~/.claude/skills/bridge/bridge.py configure <BRIDGE_ID> --config '{"key": "value"}'
```

Updates platform-specific configuration (JSON).

### Delete a bridge

```bash
python3 ~/.claude/skills/bridge/bridge.py delete <BRIDGE_ID>
```

Permanently removes a bridge and all its message history.

### Show integration context

```bash
python3 ~/.claude/skills/bridge/bridge.py context
```

Shows the current integration context that gets injected into sessions.

## Natural Language Patterns

- "Set up Telegram" → Create telegram bridge, walk user through BotFather setup
- "Connect Discord" → Create discord bridge, guide through bot setup
- "Enable iMessage" → Check platform, recommend imsg or BlueBubbles
- "Connect my Google Calendar" → Create google bridge with calendar service
- "What integrations do I have?" → Use `list`
- "Disable Discord" → Use `disable`
- "Check bridge status" → Use `list` (shows health)

## Setup Guides

### Telegram Setup
1. User creates bot via [@BotFather](https://t.me/BotFather)
2. Store token: `/secret set TELEGRAM_BOT_TOKEN --value "<token>"`
3. Create bridge: `create --platform telegram --name "My Telegram Bot"`
4. Configure: `configure <id> --config '{"botUsername": "my_bot"}'`
5. Enable: `enable <id>`

### Discord Setup
1. User creates bot in Discord Developer Portal
2. Store token: `/secret set DISCORD_BOT_TOKEN --value "<token>"`
3. Create bridge: `create --platform discord --name "My Discord Bot"`
4. Configure listen mode: `configure <id> --config '{"listenMode": "mentions"}'`
5. Enable: `enable <id>`

### iMessage Setup (macOS — imsg)
1. Install: `brew install steipete/tap/imsg`
2. Grant Full Disk Access + Automation permissions
3. Create bridge: `create --platform imessage --name "iMessage"`
4. Configure: `configure <id> --config '{"strategy": "imsg"}'`
5. Enable: `enable <id>`

### iMessage Setup (Remote — BlueBubbles)
1. Install BlueBubbles on Mac
2. Store credentials: `/secret set BLUEBUBBLES_URL --value "..."` and `/secret set BLUEBUBBLES_PASSWORD --value "..."`
3. Create bridge: `create --platform imessage --name "iMessage (BlueBubbles)"`
4. Configure: `configure <id> --config '{"strategy": "bluebubbles"}'`
5. Enable: `enable <id>`

### Google Suite Setup
1. Install: `brew install steipete/tap/gogcli`
2. Set up OAuth: `gog auth credentials <file.json>` then `gog auth add user@gmail.com`
3. Create bridge: `create --platform google --name "Google Suite"`
4. Configure services: `configure <id> --config '{"enabledServices": ["gmail", "calendar"], "account": "user@gmail.com"}'`
5. Enable: `enable <id>`

## Security Rules

1. **Never expose secret values** — Reference secret keys by name only
2. **Always confirm before enabling** — Ask user before activating a bridge
3. **Platform checks** — Only suggest imsg on macOS; suggest BlueBubbles on Linux
