---
name: memory
description: Access persistent memory across Claude sessions. Search past conversations, recall decisions, store key insights. Use when needing context from previous work or to save important information for future sessions.
allowed-tools: Bash, Read
---

# Memory Skill

Access and manage persistent memory from previous Claude sessions. Memories are automatically extracted from conversations and can be explicitly stored.

## Memory Types

| Type | Icon | Description |
|------|------|-------------|
| `decision` | [D] | Architectural or design decisions made |
| `fact` | [F] | Key facts or information learned |
| `solution` | [S] | Solutions to problems encountered |
| `pattern` | [P] | Patterns or conventions discovered |
| `preference` | [*] | User or project preferences |
| `summary` | [~] | Summarized context from sessions |

## Commands

### Search memories

```bash
python3 ~/.claude/skills/memory/memory.py search "<query>" [options]
```

Options:
- `--type <type>` - Filter by memory type
- `--project <path>` - Filter by project path
- `--limit <n>` - Max results (default: 10)

Examples:
```bash
python3 ~/.claude/skills/memory/memory.py search "authentication"
python3 ~/.claude/skills/memory/memory.py search "database" --type decision
python3 ~/.claude/skills/memory/memory.py search "API" --project "/Users/me/project"
```

### Get recent memories

```bash
python3 ~/.claude/skills/memory/memory.py recent [limit] [options]
```

Options:
- `--type <type>` - Filter by memory type

Examples:
```bash
python3 ~/.claude/skills/memory/memory.py recent
python3 ~/.claude/skills/memory/memory.py recent 5
python3 ~/.claude/skills/memory/memory.py recent --type decision
```

### Store a memory

```bash
python3 ~/.claude/skills/memory/memory.py store "<content>" [options]
```

Options:
- `--type <type>` - Memory type (default: fact)
- `--project <path>` - Associated project path
- `--relevance <0-1>` - Relevance score (default: 0.9)

Examples:
```bash
python3 ~/.claude/skills/memory/memory.py store "We use PostgreSQL with Drizzle ORM"
python3 ~/.claude/skills/memory/memory.py store "API rate limit set to 100 req/min" --type decision
python3 ~/.claude/skills/memory/memory.py store "User prefers pnpm over npm" --type preference
```

### List decisions

```bash
python3 ~/.claude/skills/memory/memory.py decisions [options]
```

Options:
- `--project <path>` - Filter by project
- `--limit <n>` - Max results (default: 20)

Examples:
```bash
python3 ~/.claude/skills/memory/memory.py decisions
python3 ~/.claude/skills/memory/memory.py decisions --project "cognova"
```

### Find memories about a topic

```bash
python3 ~/.claude/skills/memory/memory.py about "<topic>" [options]
```

Options:
- `--limit <n>` - Max results (default: 15)

Examples:
```bash
python3 ~/.claude/skills/memory/memory.py about "error handling"
python3 ~/.claude/skills/memory/memory.py about "testing strategy"
```

### Preview session context

```bash
python3 ~/.claude/skills/memory/memory.py context [options]
```

Shows what context would be injected into a new session.

Options:
- `--project <path>` - Project path
- `--limit <n>` - Max memories (default: 5)

## Natural Language Patterns

When users say things like:
- "What did we decide about..." -> Use `search` or `decisions`
- "Remember that we..." -> Use `store`
- "What do you know about..." -> Use `about`
- "Show recent context" -> Use `recent` or `context`
- "Save this insight..." -> Use `store`

## How Memory Works

### Automatic Extraction
Memories are automatically extracted from conversations:
1. **PreCompact Hook** - Before context compaction, key insights are extracted
2. **Stop Hook** - After Claude responds, important facts are saved asynchronously

### Session Context
When a new session starts, relevant memories are automatically injected based on:
- Project path matching
- Recency
- Relevance score
- Access frequency

### Relevance Scoring
Each memory has a relevance score (0-1):
- Newly stored memories start at 0.9
- Frequently accessed memories maintain higher scores
- Old, unused memories gradually decay

## Best Practices

1. **Store key decisions** - When making architectural choices, use `store --type decision`
2. **Check before changes** - Before major refactors, use `about` to check relevant history
3. **Review decisions** - Use `decisions` to see past architectural choices
4. **Explicit storage** - For critical insights, explicitly store rather than relying on auto-extraction
