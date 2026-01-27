# Database Initialization

Set up PostgreSQL database with Drizzle ORM, supporting both local development and external database connections.

## Overview

Implement a flexible database layer that:
- Uses Drizzle ORM for type-safe queries and migrations
- Runs local PostgreSQL in Docker by default
- Accepts `DATABASE_URL` to use an external database (Neon, Supabase, etc.)
- Automatically runs migrations on startup

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Compose                        │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐      ┌─────────────────────────┐   │
│  │  second-brain   │ ───► │  postgres (optional)    │   │
│  │  (Nuxt app)     │      │  Local development DB   │   │
│  └────────┬────────┘      └─────────────────────────┘   │
│           │                                              │
│           │ DATABASE_URL                                 │
│           ▼                                              │
│  ┌─────────────────────────────────────────────────┐    │
│  │  External DB (Neon, Supabase, etc.)             │    │
│  │  For production deployments                      │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## Drizzle Setup

### Dependencies

```bash
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit
```

### Folder Structure

```
/server/
├── db/
│   ├── index.ts           # Database client
│   ├── schema.ts          # Drizzle schema definitions
│   └── migrate.ts         # Migration runner
├── drizzle/
│   └── migrations/        # Generated SQL migrations
└── drizzle.config.ts      # Drizzle Kit config
```

### Schema Definition

```typescript
// server/db/schema.ts
import { pgTable, text, uuid, timestamp, integer, boolean } from 'drizzle-orm/pg-core'

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['todo', 'in_progress', 'done', 'blocked'] }).default('todo'),
  priority: integer('priority').default(0),
  project: text('project'),
  dueDate: timestamp('due_date', { withTimezone: true }),
  tags: text('tags').array(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true })
})

export const reminders = pgTable('reminders', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  message: text('message').notNull(),
  remindAt: timestamp('remind_at', { withTimezone: true }).notNull(),
  notified: boolean('notified').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

// Future: AI conversation history
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: text('session_id').notNull().unique(),
  summary: text('summary'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  messageCount: integer('message_count').default(0)
})

// Future: Auth tables (managed by BetterAuth)
```

### Database Client

```typescript
// server/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL!

// Connection for queries
const client = postgres(connectionString)
export const db = drizzle(client, { schema })

// Export schema for use in queries
export { schema }
```

### Migration Runner

```typescript
// server/db/migrate.ts
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { db } from './index'

export async function runMigrations() {
  console.log('Running database migrations...')
  await migrate(db, { migrationsFolder: './server/drizzle/migrations' })
  console.log('Migrations complete')
}
```

### Drizzle Config

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit'

export default {
  schema: './server/db/schema.ts',
  out: './server/drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!
  }
} satisfies Config
```

## Docker Compose

```yaml
services:
  second-brain:
    build: .
    container_name: second-brain
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ${VAULT_PATH:-~/vault}:/vault:rw
      - ${HOME}/.claude:/home/node/.claude:rw
      - ${HOME}/.anthropic:/home/node/.anthropic:ro
    environment:
      - DATABASE_URL=${DATABASE_URL:-postgres://postgres:postgres@db:5432/second_brain}
      - VAULT_PATH=/vault
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    container_name: second-brain-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: second_brain
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    # Only expose for local development, not in production
    profiles:
      - dev
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

## Startup Integration

### Nitro Plugin

```typescript
// server/plugins/database.ts
import { runMigrations } from '../db/migrate'

export default defineNitroPlugin(async () => {
  if (process.env.DATABASE_URL) {
    await runMigrations()
  } else {
    console.warn('DATABASE_URL not set, database features disabled')
  }
})
```

### Graceful Degradation

When `DATABASE_URL` is not set:
- Task management features are disabled
- App still works for file editing and terminal
- Show appropriate UI messages

## NPM Scripts

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

## Environment Variables

```bash
# Use local postgres (default when using docker-compose)
DATABASE_URL=postgres://postgres:postgres@db:5432/second_brain

# Use external database (Neon)
DATABASE_URL=postgres://user:pass@ep-xxx.us-east-2.aws.neon.tech/second_brain?sslmode=require

# Use external database (Supabase)
DATABASE_URL=postgres://postgres:pass@db.xxx.supabase.co:5432/postgres
```

## Implementation Steps

1. [ ] Install Drizzle dependencies
2. [ ] Create schema definition
3. [ ] Create database client
4. [ ] Set up Drizzle config
5. [ ] Generate initial migration
6. [ ] Create migration runner
7. [ ] Add Nitro plugin for startup migration
8. [ ] Update docker-compose with postgres service
9. [ ] Test with local postgres
10. [ ] Test with Neon (external)
11. [ ] Add graceful degradation when no DB
12. [ ] Update .env.example

## Dependencies

- Requires: None (foundation)
- Blocks: auth, task-skill, ai-history, search
- Related: notifications (needs db for reminders)
