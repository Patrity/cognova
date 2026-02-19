---
name: secret
description: Manage encrypted secrets for API keys, tokens, and credentials. Use when the user needs to store, retrieve, list, or delete sensitive values.
allowed-tools: Bash, Read
metadata:
  version: "1.0.0"
  requires-secrets: []
  author: Cognova
  repository: ""
  installed-from: ""
---

# Secrets Management Skill

Manage encrypted secrets stored in Cognova. Use this for API keys, tokens, webhook URLs, and any sensitive credentials that skills or integrations need.

## Commands

### List all secrets

```bash
python3 ~/.claude/skills/secret/secret.py list
```

Shows all stored secret keys with descriptions and last updated timestamps. Values are NOT shown.

### Get a secret value

```bash
python3 ~/.claude/skills/secret/secret.py get <KEY>
```

Retrieves the decrypted value of a secret. **Do NOT echo the value back to the user** — confirm it was retrieved successfully without displaying it.

Example:
```bash
python3 ~/.claude/skills/secret/secret.py get OPENAI_API_KEY
```

### Store a secret

```bash
python3 ~/.claude/skills/secret/secret.py set <KEY> --value <VALUE> [--description <DESC>]
```

Creates or updates an encrypted secret. Key names should use `SCREAMING_SNAKE_CASE`.

Examples:
```bash
python3 ~/.claude/skills/secret/secret.py set DISCORD_WEBHOOK_URL --value "https://discord.com/api/webhooks/..." --description "Discord notifications webhook"
python3 ~/.claude/skills/secret/secret.py set OPENAI_API_KEY --value "sk-..." --description "OpenAI API key for GPT integration"
```

### Delete a secret

```bash
python3 ~/.claude/skills/secret/secret.py delete <KEY>
```

Permanently removes an encrypted secret.

## Natural Language Patterns

When users say things like:
- "Store this API key..." -> Use `set`
- "Save my token for..." -> Use `set`
- "What secrets do I have?" -> Use `list`
- "Get my Discord webhook" -> Use `get`
- "Remove the old API key" -> Use `delete`
- "I need to add a key for..." -> Use `set`

## Key Naming Convention

Use `SCREAMING_SNAKE_CASE` for all secret keys:
- `GOOGLE_API_KEY`
- `DISCORD_WEBHOOK_URL`
- `OPENAI_API_KEY`
- `GITHUB_TOKEN`

## Security Rules

1. **Never echo secret values** — After `get`, confirm success without displaying the value
2. **Never store secrets elsewhere** — No memory, no notes, no files, no conversation logs
3. **Always use this skill** — When a user provides a credential, store it here immediately
4. **Warn on exposure** — If a user pastes a key/token in chat, warn them and offer to store it
