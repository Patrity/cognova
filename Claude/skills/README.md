# Cognova Skills

Built-in Claude Code skills for Cognova task and project management.

## Available Skills

| Skill | Command | Description |
|-------|---------|-------------|
| Task | `/task` | Create, list, update, complete tasks |
| Project | `/project` | Manage projects with duplicate prevention |
| Skill Creator | `/skill-creator` | Assists in creating new Claude Code skills |

## Usage

### In Container (Production)

Skills are automatically available when running Cognova in Docker:

```bash
docker compose up -d
docker exec -it cognova claude

# Inside Claude Code:
> /task list
> /project search homelab
```

### Local Development

Run skills directly with Python:

```bash
# Ensure dev server is running
pnpm dev

# Test task skill (from project root)
python3 Claude/skills/task/task.py list
python3 Claude/skills/task/task.py create "Test task" --priority 2

# Test project skill
python3 Claude/skills/project/project.py list
python3 Claude/skills/project/project.py search "home"
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `COGNOVA_API_URL` | `http://localhost:3000` | API base URL |

## Directory Structure

```
Claude/
├── CLAUDE.md              # Default project instructions
├── rules/                 # Documentation standards
│   ├── markdown.md        # Formatting conventions
│   ├── note-organization.md  # File/folder structure
│   └── frontmatter.md     # Required metadata
└── skills/
    ├── _lib/              # Shared Python utilities
    │   ├── api.py         # HTTP client
    │   └── output.py      # Output formatting
    ├── task/              # Task management skill
    ├── project/           # Project management skill
    └── skill-creator/     # Skill authoring assistant
```

## Creating New Skills

Use the Skill Creator skill or follow these patterns:

### Pure Instruction Skill

For simple workflows where Claude uses existing tools:

```
skills/my-skill/
└── SKILL.md
```

### Python Script Skill

For complex operations requiring API calls:

```
skills/my-skill/
├── SKILL.md
└── my_skill.py
```

### SKILL.md Template

```yaml
---
name: my-skill
description: When Claude should use this skill
allowed-tools: Bash, Read
---

# My Skill

Instructions for Claude to follow...

## Commands

\`\`\`bash
python3 .claude/skills/my-skill/my_skill.py <command> [options]
\`\`\`
```

## Shared Library

Skills can import from `_lib/`:

```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / '_lib'))

from api import get, post, put, delete
from output import success, error, format_task
```

## Docker Integration

The `Claude/` folder is copied to `/home/node/.claude/` during Docker build:

```dockerfile
# From Dockerfile
RUN mkdir -p /home/node/.claude && \
    cp -r /app/Claude/* /home/node/.claude/ && \
    chown -R node:node /home/node/.claude
```

This makes skills available as `/task`, `/project`, etc. when running Claude Code inside the container.
