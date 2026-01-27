# Skills System

Project-specific Claude Code skills that integrate with Second Brain's ecosystem.

## Overview

Create a `/skills/` folder at the repo root containing custom skills designed for this project. These skills are copied to `.claude/commands/` during Docker build, making them available to Claude Code inside the container.

## Folder Structure

```
/skills/
├── README.md              # Documentation for skill authors
├── vault/                 # Vault interaction skills
│   ├── SKILL.md
│   ├── read.ts            # Read files from vault
│   ├── write.ts           # Write files to vault
│   └── search.ts          # Search vault contents
├── tasks/                 # Task management (depends on database)
│   ├── SKILL.md
│   ├── create.ts
│   ├── list.ts
│   ├── update.ts
│   └── complete.ts
├── notify/                # Gotify notifications
│   ├── SKILL.md
│   └── send.ts
└── integrations/          # Future external integrations
    ├── google/
    ├── github/
    └── email/
```

## Docker Integration

### Dockerfile Changes

```dockerfile
# Copy project skills to Claude Code commands directory
COPY /skills/ /home/node/.claude/commands/second-brain/
```

### Alternative: Runtime Mount

Instead of copying at build time, mount at runtime for easier development:

```yaml
# docker-compose.yml
volumes:
  - ./skills:/home/node/.claude/commands/second-brain:ro
```

## Skill Format

Each skill follows Claude Code's skill format:

### SKILL.md (Metadata)

```markdown
# Vault Read

Read files from the Second Brain vault.

## Usage

\`\`\`
/vault-read <path>
\`\`\`

## Arguments

- `path` - Relative path within the vault (e.g., "inbox/notes.md")
```

### Implementation (TypeScript)

```typescript
// skills/vault/read.ts
import { readFile } from 'fs/promises'
import { join } from 'path'

const VAULT_PATH = process.env.VAULT_PATH || '/vault'

export async function execute(args: string[]) {
  const relativePath = args[0]
  if (!relativePath) {
    return { error: 'Path required' }
  }

  const fullPath = join(VAULT_PATH, relativePath)

  // Security: ensure path is within vault
  if (!fullPath.startsWith(VAULT_PATH)) {
    return { error: 'Path must be within vault' }
  }

  const content = await readFile(fullPath, 'utf-8')
  return { content, path: relativePath }
}
```

## Core Skills to Implement

### 1. Vault Skills

| Skill | Command | Description |
|-------|---------|-------------|
| vault-read | `/vault-read <path>` | Read file contents |
| vault-write | `/vault-write <path>` | Write/create file |
| vault-list | `/vault-list [path]` | List directory contents |
| vault-search | `/vault-search <query>` | Full-text search |
| vault-move | `/vault-move <from> <to>` | Move/rename file |

### 2. Task Skills (After Database)

| Skill | Command | Description |
|-------|---------|-------------|
| task-create | `/task <title>` | Create new task |
| task-list | `/tasks [filter]` | List tasks |
| task-done | `/task-done <id>` | Mark complete |
| task-update | `/task-update <id>` | Modify task |

### 3. Notification Skills

| Skill | Command | Description |
|-------|---------|-------------|
| notify | `/notify <message>` | Send Gotify notification |
| remind | `/remind <time> <msg>` | Schedule reminder |

## Environment Variables

Skills inherit environment from the container:

```bash
VAULT_PATH=/vault
DATABASE_URL=postgresql://...
GOTIFY_URL=https://...
GOTIFY_TOKEN=...
```

## Security Considerations

1. **Path Traversal** - All vault operations must validate paths stay within vault root
2. **Database Access** - Skills connect directly to database, same security as API
3. **External APIs** - Credentials stored in env vars, never in skill code
4. **User Context** - Future: Pass user ID to skills for multi-tenant isolation

## Development Workflow

1. Create skill in `/skills/` folder
2. Test locally with `claude` CLI
3. Build Docker image to verify integration
4. Skills are automatically available in deployed container

## Dependencies

- Requires: Docker build process
- Blocks: task-skill, notify skill
- Related: cron-agents (uses skills)

## Implementation Steps

1. [ ] Create `/skills/` folder structure
2. [ ] Add Dockerfile COPY instruction
3. [ ] Implement vault-read skill
4. [ ] Implement vault-write skill
5. [ ] Implement vault-list skill
6. [ ] Add skill documentation
7. [ ] Test in container
