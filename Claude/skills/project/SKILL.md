---
name: project
description: Manage Cognova projects - create, list, update projects. ALWAYS searches for existing projects before creating new ones. ALWAYS confirms with user before creating, showing potential matches.
allowed-tools: Bash, Read
metadata:
  version: "1.0.0"
  requires-secrets: []
  author: Cognova
  repository: ""
  installed-from: ""
---

# Project Management Skill

Manage projects in Cognova. Projects organize related tasks.

## CRITICAL: Duplicate Prevention

**ALWAYS search for existing projects before creating:**
1. Run `python3 ~/.claude/skills/project/project.py search <name>` first
2. Show user any matches found
3. Only create if user confirms no existing project fits

## Commands

### Search for projects

```bash
python3 ~/.claude/skills/project/project.py search <query>
```

Example:
```bash
python3 ~/.claude/skills/project/project.py search "home"
# Output: Found 2 projects matching "home":
#   - homelab (#3b82f6) - ID: abc12345
#   - home-automation (#22c55e) - ID: def67890
```

### List all projects

```bash
python3 ~/.claude/skills/project/project.py list
```

### Create a project

```bash
python3 ~/.claude/skills/project/project.py create <name> --color <hex> [--description <text>]
```

**Required:** `--color` must be a valid hex color (e.g., #3b82f6)

Example:
```bash
python3 ~/.claude/skills/project/project.py create "Cognova" --color "#8b5cf6" --description "Personal knowledge management app"
```

### Update a project

```bash
python3 ~/.claude/skills/project/project.py update <id> [options]
```

Options:
- `--name <name>` - New project name
- `--color <hex>` - New color
- `--description <text>` - New description

### Delete a project

```bash
python3 ~/.claude/skills/project/project.py delete <id>
```

## Workflow: Creating a Project

When user asks to create a project:

1. **Search first:**
   ```bash
   python3 ~/.claude/skills/project/project.py search "project name"
   ```

2. **If matches found, ask user:**
   "I found these existing projects that might match:
   - existing-project-1
   - existing-project-2

   Would you like to use one of these, or create a new project?"

3. **If user confirms new project:**
   - Ask for color preference (suggest one if not provided)
   - Create with: `python3 ~/.claude/skills/project/project.py create "name" --color "#hexcolor"`

## Color Suggestions

When user doesn't specify a color, suggest based on project type:
- Development/Tech: Blue (#3b82f6)
- Personal: Purple (#8b5cf6)
- Health: Green (#22c55e)
- Finance: Yellow (#eab308)
- Home: Orange (#f97316)
- Work: Red (#ef4444)

## Natural Language Patterns

- "Create a project for..." -> Search first, then create with confirmation
- "List my projects" -> Use `list`
- "Find projects about..." -> Use `search`
- "Show project colors" -> Use `list` and display colors
