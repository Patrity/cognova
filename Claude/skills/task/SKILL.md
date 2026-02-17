---
name: task
description: Manage Cognova tasks - create, list, update, complete tasks. Use when the user wants to track work items, todos, or action items. Can search for and associate tasks with projects.
allowed-tools: Bash, Read
---

# Task Management Skill

Manage tasks in Cognova through natural language commands.

## Commands

### Create a task

```bash
python3 ~/.claude/skills/task/task.py create "Task title" [options]
```

Options:
- `--project <name>` - Associate with project (searches for match)
- `--priority <1|2|3>` - Set priority (1=Low, 2=Medium, 3=High)
- `--due <date>` - Set due date (YYYY-MM-DD or natural: "tomorrow", "next monday")
- `--tags <tag1,tag2>` - Add comma-separated tags
- `--description <text>` - Add description

Examples:
```bash
python3 ~/.claude/skills/task/task.py create "Review PR for auth feature" --project "cognova" --priority 3
python3 ~/.claude/skills/task/task.py create "Call dentist" --due tomorrow
python3 ~/.claude/skills/task/task.py create "Write documentation" --tags "docs,urgent"
```

### List tasks

```bash
python3 ~/.claude/skills/task/task.py list [filters]
```

Filters:
- `--status <todo|in_progress|done|blocked>` - Filter by status
- `--project <name>` - Filter by project (partial match)
- `--search <query>` - Search title/description
- `--due <today|week|overdue>` - Filter by due date

Examples:
```bash
python3 ~/.claude/skills/task/task.py list
python3 ~/.claude/skills/task/task.py list --project homelab --status todo
python3 ~/.claude/skills/task/task.py list --due overdue
```

### Update a task

```bash
python3 ~/.claude/skills/task/task.py update <id> [options]
```

Options: Same as create, plus `--status`

Example:
```bash
python3 ~/.claude/skills/task/task.py update abc123 --status in_progress --priority 3
```

### Complete a task

```bash
python3 ~/.claude/skills/task/task.py done <id_or_search>
```

Examples:
```bash
python3 ~/.claude/skills/task/task.py done abc123
python3 ~/.claude/skills/task/task.py done "PR review"
```

### Delete a task

```bash
python3 ~/.claude/skills/task/task.py delete <id>
```

## Natural Language Patterns

When users say things like:
- "Create a task to..." -> Use `create`
- "What tasks do I have..." -> Use `list`
- "Mark X as done" -> Use `done`
- "I finished the..." -> Use `done` with search
- "Show my todos" -> Use `list --status todo`

## Project Association

When creating tasks with `--project`:
1. The skill searches for matching projects
2. If one match found, associates automatically
3. If multiple matches, lists them for user to choose
4. If no match, creates task without project and suggests creating one

## Frontmatter Standards

All markdown documents in the vault use YAML frontmatter for metadata. When new documents are created or discovered without frontmatter, defaults are automatically added:

```yaml
---
tags: []
shared: false
---
```

### Frontmatter Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `tags` | string[] | `[]` | Array of tag strings for categorization |
| `shared` | boolean | `false` | Visibility: `false` = hidden (auth required) |
| `shareType` | string | - | When `shared: true`: `'private'` (link only) or `'public'` (indexed) |
| `title` | string | - | Optional override; extracted from H1 or filename if not set |
| `project` | string | - | Project ID for document association |

### Visibility Modes

Documents support three visibility levels:

1. **Hidden** (default) - `shared: false`
   - Requires authentication
   - Never publicly accessible

2. **Private** - `shared: true, shareType: 'private'`
   - Accessible via direct link
   - Not indexed by search engines

3. **Public** - `shared: true, shareType: 'public'`
   - Publicly accessible
   - Indexed by search engines
