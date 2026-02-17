---
tags: []
shared: false
---
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

## Environment Variables

Skills inherit environment from the container:

```bash
VAULT_PATH=/vault
DATABASE_URL=postgresql://...
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
- Blocks: task-skill
- Related: cron-agents (uses skills)

## Script-Free Skills

Some skills need no executable—just a `SKILL.md` with instructions. Claude handles the logic directly.

### Example: /capture

```markdown
# Capture

Quickly capture a note to the inbox.

## /capture <note>

Create a new note in `inbox/` with today's date and a slug from the content.

Example:
- `/capture Interesting idea about project structure`

Creates: `inbox/2026-01-14-interesting-idea-about-project-structure.md`

## Process

1. Generate filename from date + slugified title
2. Create markdown file with frontmatter:
   ```markdown
   ---
   created: 2026-01-14T10:30:00
   status: inbox
   ---

   Interesting idea about project structure
   ```
3. Confirm creation to user
```

## CLAUDE.md Integration

Skills can be orchestrated via CLAUDE.md for session behaviors:

```markdown
# Second Brain

You are my personal knowledge management assistant.

## On Session Start

1. Run `/remind check` to see if any reminders are due
2. Run `/tasks` to show current task list
3. Greet me with a brief summary

## Core Behaviors

- **Task awareness**: Reference tasks when relevant to conversation
- **Capture insights**: Offer to save important information with `/capture`
- **Check before answering**: Search existing notes before giving advice
- **Suggest connections**: Link related ideas across the vault
```

## Reference Implementations

These Python implementations serve as reference for porting to TypeScript.

### Date Parsing Utility

Natural language date parsing for task due dates:

```python
from datetime import datetime, timedelta
from dateutil import parser as dateparser
from dateutil.relativedelta import relativedelta, FR, MO, TU, WE, TH, SA, SU

def parse_due_date(due_str: str) -> datetime:
    """Parse natural language dates."""
    today = datetime.now().replace(hour=9, minute=0, second=0, microsecond=0)
    due_lower = due_str.lower().strip()

    if due_lower == 'today':
        return today
    elif due_lower == 'tomorrow':
        return today + timedelta(days=1)
    elif due_lower in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']:
        weekdays = {'monday': MO, 'tuesday': TU, 'wednesday': WE, 'thursday': TH,
                    'friday': FR, 'saturday': SA, 'sunday': SU}
        return today + relativedelta(weekday=weekdays[due_lower](+1))
    elif due_lower == 'next week':
        return today + relativedelta(weeks=1, weekday=MO)
    elif due_lower.startswith('in '):
        # "in 3 days", "in 2 weeks"
        parts = due_lower[3:].split()
        num = int(parts[0])
        unit = parts[1].rstrip('s')
        if unit == 'day':
            return today + timedelta(days=num)
        elif unit == 'week':
            return today + timedelta(weeks=num)

    # Fallback to dateutil parser
    return dateparser.parse(due_str)
```

### Tasks Skill (Python Reference)

```python
#!/usr/bin/env python3
"""Task management skill."""

import os
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.environ.get('DATABASE_URL')

def get_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def list_tasks():
    """List all incomplete tasks."""
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT id, title, status, priority, project, due_date
            FROM tasks
            WHERE status != 'done'
            ORDER BY
                CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
                due_date ASC,
                priority DESC,
                created_at DESC
        """)
        tasks = cur.fetchall()

    if not tasks:
        print("No tasks found.")
        return

    # Group by project
    projects = {}
    for t in tasks:
        proj = t['project'] or 'No Project'
        if proj not in projects:
            projects[proj] = []
        projects[proj].append(t)

    for proj, items in projects.items():
        print(f"\n## {proj}\n")
        for t in items:
            status_icon = {'todo': '○', 'in_progress': '●', 'blocked': '⊘'}[t['status']]
            short_id = str(t['id'])[:8]
            due = f" (due: {t['due_date'].strftime('%b %d')})" if t['due_date'] else ""
            priority = "!" * t['priority'] if t['priority'] > 0 else ""
            print(f"  {status_icon} [{short_id}] {priority}{t['title']}{due}")

def add_task(title: str, due: str = None, project: str = None, priority: int = 0):
    """Add a new task."""
    due_date = parse_due_date(due) if due else None

    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO tasks (title, due_date, project, priority)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """, (title, due_date, project, priority))
        task_id = cur.fetchone()['id']
        conn.commit()

    print(f"Created task [{str(task_id)[:8]}]: {title}")

def update_status(task_id: str, status: str):
    """Update task status."""
    with get_connection() as conn:
        cur = conn.cursor()
        completed_at = datetime.now() if status == 'done' else None
        cur.execute("""
            UPDATE tasks
            SET status = %s, updated_at = NOW(), completed_at = %s
            WHERE id::text LIKE %s
        """, (status, completed_at, f"{task_id}%"))
        conn.commit()

    action = {'done': 'Completed', 'in_progress': 'Started', 'blocked': 'Blocked'}[status]
    print(f"{action} task [{task_id}]")
```

## Implementation Steps

1. [ ] Create `/skills/` folder structure
2. [ ] Add Dockerfile COPY instruction
3. [ ] Implement vault-read skill
4. [ ] Implement vault-write skill
5. [ ] Implement vault-list skill
6. [ ] Implement task skills (port from Python reference)
7. [ ] Add skill documentation
9. [ ] Test in container
