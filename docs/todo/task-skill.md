# Task Skill

Claude Code skill for natural language task management. Enables conversational task creation, updates, and queries.

## Overview

Create a skill that allows Claude to interact with the task database through natural conversation:

- "Create a task to review the PR tomorrow"
- "What tasks do I have for the homelab project?"
- "Mark the database migration task as done"
- "Remind me about the dentist appointment in 2 hours"

## Natural Language Examples

| User Says | Skill Action |
|-----------|--------------|
| "Add a task to fix the login bug" | `/task-create title="Fix the login bug"` |
| "Make a high priority task for the demo" | `/task-create title="Prepare demo" priority=high` |
| "Show my tasks for today" | `/task-list due=today` |
| "What's on my plate for homelab?" | `/task-list project=homelab` |
| "Done with the API refactor" | `/task-done search="API refactor"` |
| "Remind me to call mom at 5pm" | `/remind time="5pm" message="Call mom"` |

## Skill Structure

```
/skills/tasks/
├── SKILL.md           # Skill documentation
├── create.ts          # Create new task
├── list.ts            # List/search tasks
├── update.ts          # Modify existing task
├── complete.ts        # Mark task done
└── utils/
    ├── db.ts          # Database connection
    └── parse.ts       # Natural language parsing helpers
```

## Skill Implementations

### Create Task

```typescript
// skills/tasks/create.ts
import { db, schema } from './utils/db'

interface CreateTaskArgs {
  title: string
  description?: string
  project?: string
  priority?: 'low' | 'medium' | 'high'
  due?: string  // Natural language: "tomorrow", "next week", "2024-01-15"
  tags?: string[]
}

export async function execute(args: CreateTaskArgs) {
  const priorityMap = { low: 0, medium: 1, high: 2 }

  const [task] = await db.insert(schema.tasks).values({
    title: args.title,
    description: args.description,
    project: args.project,
    priority: args.priority ? priorityMap[args.priority] : 0,
    dueDate: args.due ? parseNaturalDate(args.due) : null,
    tags: args.tags || []
  }).returning()

  return {
    success: true,
    task: {
      id: task.id,
      title: task.title,
      project: task.project,
      dueDate: task.dueDate
    },
    message: `Created task: "${task.title}"`
  }
}
```

### List Tasks

```typescript
// skills/tasks/list.ts
import { db, schema } from './utils/db'
import { eq, and, lte, gte, ilike } from 'drizzle-orm'

interface ListTaskArgs {
  status?: 'todo' | 'in_progress' | 'done' | 'blocked' | 'all'
  project?: string
  due?: 'today' | 'week' | 'overdue'
  search?: string
  limit?: number
}

export async function execute(args: ListTaskArgs) {
  const conditions = []

  // Status filter (default: not done)
  if (args.status && args.status !== 'all') {
    conditions.push(eq(schema.tasks.status, args.status))
  } else if (!args.status) {
    conditions.push(ne(schema.tasks.status, 'done'))
  }

  // Project filter
  if (args.project) {
    conditions.push(ilike(schema.tasks.project, `%${args.project}%`))
  }

  // Due date filter
  if (args.due === 'today') {
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    conditions.push(lte(schema.tasks.dueDate, today))
  } else if (args.due === 'week') {
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    conditions.push(lte(schema.tasks.dueDate, nextWeek))
  } else if (args.due === 'overdue') {
    conditions.push(lte(schema.tasks.dueDate, new Date()))
  }

  // Search filter
  if (args.search) {
    conditions.push(ilike(schema.tasks.title, `%${args.search}%`))
  }

  const tasks = await db.select()
    .from(schema.tasks)
    .where(and(...conditions))
    .orderBy(schema.tasks.priority, schema.tasks.dueDate)
    .limit(args.limit || 20)

  return {
    count: tasks.length,
    tasks: tasks.map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      project: t.project,
      priority: t.priority,
      dueDate: t.dueDate
    }))
  }
}
```

### Complete Task

```typescript
// skills/tasks/complete.ts
import { db, schema } from './utils/db'
import { eq, ilike } from 'drizzle-orm'

interface CompleteTaskArgs {
  id?: string      // Direct ID
  search?: string  // Find by title match
}

export async function execute(args: CompleteTaskArgs) {
  let taskId = args.id

  // Find task by search if no ID provided
  if (!taskId && args.search) {
    const [found] = await db.select()
      .from(schema.tasks)
      .where(ilike(schema.tasks.title, `%${args.search}%`))
      .limit(1)

    if (!found) {
      return { success: false, error: `No task found matching "${args.search}"` }
    }
    taskId = found.id
  }

  const [updated] = await db.update(schema.tasks)
    .set({
      status: 'done',
      completedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(schema.tasks.id, taskId))
    .returning()

  return {
    success: true,
    task: updated,
    message: `Completed: "${updated.title}"`
  }
}
```

## SKILL.md Documentation

```markdown
# Task Management

Manage tasks through natural language commands.

## Commands

### Create Task
\`/task <title> [options]\`

Options:
- `--project <name>` - Assign to project
- `--priority <low|medium|high>` - Set priority
- `--due <date>` - Set due date (natural language)
- `--tags <tag1,tag2>` - Add tags

Examples:
- `/task Fix the login bug`
- `/task Review PR --project homelab --priority high`
- `/task Call dentist --due tomorrow`

### List Tasks
\`/tasks [filters]\`

Filters:
- `--project <name>` - Filter by project
- `--status <todo|in_progress|done|blocked>` - Filter by status
- `--due <today|week|overdue>` - Filter by due date

Examples:
- `/tasks`
- `/tasks --project homelab`
- `/tasks --due today`

### Complete Task
\`/task-done <id or search>\`

Examples:
- `/task-done abc123`
- `/task-done "login bug"`

### Update Task
\`/task-update <id> [options]\`

Options: Same as create

Examples:
- `/task-update abc123 --status in_progress`
- `/task-update abc123 --due "next monday"`
```

## Claude Integration

Claude should recognize task-related intent and invoke appropriate skills:

```
User: "I need to remember to review that PR tomorrow"

Claude thinking:
- Intent: Create task
- Title: "Review PR"
- Due: tomorrow

Claude action: /task "Review PR" --due tomorrow

Claude response: "I've created a task to review the PR, due tomorrow."
```

## Database Utilities

```typescript
// skills/tasks/utils/db.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../../../../server/db/schema'

const client = postgres(process.env.DATABASE_URL!)
export const db = drizzle(client, { schema })
export { schema }
```

## Natural Date Parsing

```typescript
// skills/tasks/utils/parse.ts
export function parseNaturalDate(input: string): Date | null {
  const now = new Date()
  const lower = input.toLowerCase()

  if (lower === 'today') {
    return now
  }
  if (lower === 'tomorrow') {
    const d = new Date(now)
    d.setDate(d.getDate() + 1)
    return d
  }
  if (lower === 'next week') {
    const d = new Date(now)
    d.setDate(d.getDate() + 7)
    return d
  }
  if (lower.includes('monday')) {
    return getNextDayOfWeek(1)
  }
  // ... more patterns

  // Try parsing as date string
  const parsed = new Date(input)
  return isNaN(parsed.getTime()) ? null : parsed
}
```

## Implementation Steps

1. [ ] Create skills/tasks folder structure
2. [ ] Implement database utilities
3. [ ] Implement create.ts
4. [ ] Implement list.ts
5. [ ] Implement complete.ts
6. [ ] Implement update.ts
7. [ ] Add natural date parsing
8. [ ] Write SKILL.md documentation
9. [ ] Test with Claude Code
10. [ ] Add to Docker build

## Dependencies

- Requires: database-init, skills-system
- Blocks: None
- Related: notifications (for reminders), cron-agents
