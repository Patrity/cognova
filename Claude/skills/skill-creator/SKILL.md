---
name: skill-creator
description: Assists users in creating new Claude Code skills. Uses web search to find latest conventions and suggests alternative approaches (existing MCPs, plugins) when appropriate.
allowed-tools: Bash, Read, Write, WebSearch, WebFetch
disable-model-invocation: true
---

# Skill Creator

Assists in creating new Claude Code skills for Second Brain or personal use.

## Process

When a user asks to create a new skill:

### 1. Understand the Requirement

Ask clarifying questions:
- What should the skill do?
- Should it be invokable by user, Claude, or both?
- Does it need to call external APIs?
- Should it run in a subagent (forked context)?

### 2. Check for Existing Solutions

**ALWAYS search before implementing:**

```
WebSearch: "Claude Code MCP <functionality>"
WebSearch: "Claude Code plugin <functionality>"
WebSearch: "anthropic MCP server <functionality>"
```

If an MCP or plugin exists:
- Explain what it does
- Show how to install/configure it
- Ask if user still wants a custom skill

### 3. Determine Skill Type

| Type | When to Use | Example |
|------|-------------|---------|
| **Pure Instruction** | Claude can handle with existing tools | `/capture` - save note to inbox |
| **Python Script** | Needs API calls, complex logic | `/task` - manage tasks via API |
| **Subagent** | Long-running, exploratory | `/research` - deep dive on topic |

### 4. Create the Skill

#### For Pure Instruction Skills

Create only `SKILL.md` in the appropriate location:

- Personal: `~/.claude/skills/<skill-name>/SKILL.md`
- Project: `.claude/skills/<skill-name>/SKILL.md`

```yaml
---
name: skill-name
description: When to use this skill
allowed-tools: Bash, Read, Write, etc.
---

# Skill Name

Instructions for Claude to follow...

## Usage

/skill-name <args>

## Process

1. Step one
2. Step two
...
```

#### For Python Script Skills

Create `SKILL.md` + `script.py`:

**SKILL.md Template:**
```yaml
---
name: skill-name
description: Description for Claude's auto-invocation
allowed-tools: Bash, Read
---

# Skill Name

## Commands

\`\`\`bash
python3 ~/.claude/skills/<name>/<name>.py <command> [options]
\`\`\`

## Examples
...
```

**Python Template:**
```python
#!/usr/bin/env python3
"""Skill description."""

import argparse
import sys
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description='Skill Name')
    # Add subparsers for commands
    args = parser.parse_args()
    # Execute command

if __name__ == '__main__':
    main()
```

### 5. Accessing Secrets & API Keys

**NEVER hardcode API keys, tokens, or sensitive values in skills.**

Second Brain provides an encrypted secrets store. Use the shared API client:

```python
#!/usr/bin/env python3
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))  # Add parent for _lib
from _lib.api import get_secret, get, post

# Fetch a secret by key
success, api_key = get_secret("GOOGLE_API_KEY")
if not success:
    print(f"Error: {api_key}")
    print("Add this secret at Settings > Secrets in the dashboard")
    sys.exit(1)

# Now use api_key safely
```

**Key naming convention:** `SCREAMING_SNAKE_CASE` (e.g., `DISCORD_WEBHOOK_URL`, `OPENAI_API_KEY`)

**Managing secrets:**
- Dashboard: Settings > Secrets tab
- Create: Add key + value (value is encrypted at rest)
- Skills fetch decrypted values via `get_secret()`

**When to use secrets vs environment variables:**
| Use Case | Approach |
|----------|----------|
| API keys for external services | Secrets store (`get_secret()`) |
| Webhook URLs, tokens | Secrets store |
| Second Brain API URL | Environment variable (pre-configured) |
| Database URLs | Environment variables (system config) |

#### Environment Variables

The `_lib/api.py` module automatically handles these environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `SECOND_BRAIN_API_URL` | `http://localhost:3000` | API base URL |
| `SECOND_BRAIN_API_TOKEN` | Auto-generated | Auth token (auto-read from `.api-token`) |

**For Docker deployments**, these are pre-configured in `docker-compose.yml`. Skills don't need to set them.

**For local development**, the API token is auto-generated on server startup and written to `.api-token` in the project root. The `_lib/api.py` module reads it automatically.

**Custom environment variables** can be added to `.env` (local) or `docker-compose.yml` (Docker):

```bash
# .env
MY_CUSTOM_VAR=value
```

```python
# In skill
import os
my_var = os.environ.get('MY_CUSTOM_VAR', 'default')
```

### 6. Skill Frontmatter Options

| Option | Values | Description |
|--------|--------|-------------|
| `name` | string | Command name (becomes `/name`) |
| `description` | string | When Claude should use this skill |
| `allowed-tools` | Bash, Read, Write, Edit, WebSearch, WebFetch, Grep, Glob | Tools Claude can use |
| `disable-model-invocation` | true | User-only, Claude won't auto-invoke |
| `user-invocable` | false | Claude-only, hidden from user menu |
| `context` | fork | Run in subagent |
| `agent` | Explore, Plan, general-purpose | Agent type for subagent |

### 7. Skill Locations

| Location | Use Case |
|----------|----------|
| `~/.claude/skills/` | Personal + Second Brain bundled skills |
| `.claude/skills/` | Project-specific skills |

### 8. Testing

```bash
# Test Python script directly
python3 ~/.claude/skills/<name>/<name>.py --help

# Test via Claude Code
claude
> /skill-name test
```

## Example: Creating a Simple Skill

User: "I want a skill to quickly add notes to my inbox"

Response:
"This is perfect for a pure instruction skill. Let me create it:

**File: `~/.claude/skills/capture/SKILL.md`**
```yaml
---
name: capture
description: Quickly capture a note to the inbox folder
allowed-tools: Write
---

# Quick Capture

Save a quick note to the inbox.

## Usage

/capture <note content>

## Process

1. Generate filename: `inbox/YYYY-MM-DD-<slugified-title>.md`
2. Create file with frontmatter:
   \`\`\`markdown
   ---
   created: <ISO timestamp>
   status: inbox
   ---

   <note content>
   \`\`\`
3. Confirm creation to user
```

This skill needs no Python script - Claude will use the Write tool directly."

## Web Search Patterns

For finding existing solutions:
- MCPs: `"MCP server" <functionality> site:github.com`
- Claude plugins: `"claude code" plugin <functionality>`
- Best practices: `"claude code" skill best practices`
- Latest conventions: `site:code.claude.com skills`
