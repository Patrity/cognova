---
tags: []
shared: false
---
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
│   ├── migrate.ts         # Migration runner
│   └── types.ts           # Inferred TypeScript types
├── drizzle/
│   └── migrations/        # Generated SQL migrations
├── utils/
│   ├── db-state.ts        # Database availability tracking
│   └── db-guard.ts        # Route protection helper
├── plugins/
│   └── 01.database.ts     # Startup initialization
└── drizzle.config.ts      # Drizzle Kit config (project root)
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

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: text('session_id').notNull().unique(),
  summary: text('summary'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  messageCount: integer('message_count').default(0)
})
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
    profiles:
      - local
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

## Startup Integration

### Nitro Plugin

```typescript
// server/plugins/01.database.ts
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
    "db:studio": "drizzle-kit studio",
    "db:up": "docker compose --profile local up -d db",
    "db:down": "docker compose --profile local down",
    "docker:up": "./scripts/docker-up.sh -d",
    "docker:down": "docker compose --profile local down"
  }
}
```

## Database Workflow

### Development vs Production

### Development Workflow

In development, use `db:push` for fast iteration:

```bash
# Start local postgres
pnpm db:up

# Make schema changes in server/db/schema.ts
# Then push directly to database
pnpm db:push
```

Migrations are **skipped by default** in development to avoid conflicts with `db:push`.

### Production Workflow

Before deploying schema changes:

```bash
# 1. Generate migration from schema changes
pnpm db:generate

# 2. Review generated SQL in server/drizzle/migrations/

# 3. Deploy - migrations run automatically on startup
```

### Environment Variables

### Troubleshooting

**Error: Migration already applied**

This happens when you use `db:push` then `db:generate` on the same database. Options:

1. **Delete the migration file** - If still in development
  ```bash
   rm server/drizzle/migrations/XXXX_migration_name.sql
  ```
2. **Mark as applied** - If you need to keep the migration
  ```sql
   INSERT INTO __drizzle_migrations (hash, created_at)
   VALUES ('XXXX_migration_name', EXTRACT(EPOCH FROM NOW()) * 1000);
  ```
3. **Force migrations in dev** - For testing
  ```bash
   DB_SKIP_MIGRATIONS=false pnpm dev
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

1. [x] Install Drizzle dependencies
2. [x] Create schema definition
3. [x] Create database client
4. [x] Set up Drizzle config
5. [x] Generate initial migration
6. [x] Create migration runner
7. [x] Add Nitro plugin for startup migration
8. [x] Update docker-compose with postgres service
9. [x] Test with local postgres
10. [x] Test with Neon (external)
11. [x] Add graceful degradation when no DB
12. [x] Update .env.example

## Dependencies

- Requires: None (foundation)
- Blocks: auth, task-skill, ai-history, search
- Related: notifications (needs db for reminders)

---

## Completion Notes

**Completed:** 2026-01-27

### What Was Implemented

- Drizzle ORM with `postgres` driver (works for both local and Neon)
- PostgreSQL advisory locks for race-safe migrations (`pg_try_advisory_lock`)
- SSL auto-detection based on DATABASE_URL (Neon = require, local = false)
- Docker Compose with `--profile local` for optional postgres service
- Smart `pnpm docker:up` script that auto-detects local vs remote
- Health endpoint with database status (`/api/health`)
- Graceful degradation when DATABASE_URL not set

### Changes from Original Plan

### Files Created

- `drizzle.config.ts`
- `server/db/schema.ts`
- `server/db/index.ts`
- `server/db/migrate.ts`
- `server/db/types.ts`
- `server/utils/db-state.ts`
- `server/utils/db-guard.ts`
- `server/plugins/01.database.ts`
- `server/drizzle/migrations/0000_brown_george_stacy.sql`
- `scripts/docker-up.sh`

