---
paths: "server/db/**/*.ts,drizzle.config.ts"
---

# Database Rules (Drizzle ORM + node-postgres)

## Directory Structure

```
server/db/
├── schema/           # Table definitions
│   ├── auth.ts       # better-auth tables (user, session, account, verification)
│   ├── providers.ts  # Provider types, providers, models
│   ├── agents.ts     # Installed agents, agent configs
│   ├── conversations.ts
│   ├── tasks.ts
│   ├── memory.ts
│   ├── cron.ts
│   ├── documents.ts
│   ├── system.ts     # Secrets, token usage, app settings
│   └── index.ts      # Re-exports all schemas
├── migrations/       # Generated migrations (don't edit manually)
└── index.ts          # DB client singleton (getDb, getPool, warmupDb, closeDb)
```

## Connection (node-postgres)

We use `pg` (node-postgres) with a connection pool, NOT Neon serverless:

```typescript
import { getDb, schema } from '~~/server/db'

// getDb() is a lazy singleton — safe to call from any server context
const db = getDb()
```

The singleton is initialized on first call using `useRuntimeConfig().databaseUrl`. Never import `pg` directly in API routes — always go through `getDb()`.

## Schema Definition

Define tables in `server/db/schema/`:

```typescript
import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core'

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  status: text('status').default('todo'),
  priority: integer('priority').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})
```

## Type Export Workflow

Types are inferred from Drizzle schemas in `shared/types/index.ts`:

```typescript
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { tasks } from '~~/server/db/schema'

export type Task = InferSelectModel<typeof tasks>
export type NewTask = InferInsertModel<typeof tasks>
```

When adding/modifying schemas:
1. Define schema in `server/db/schema/*.ts`
2. Update `server/db/schema/index.ts` re-exports if new file
3. Update `shared/types/index.ts` with inferred types
4. Run `pnpm db:generate` to create migration
5. Run `pnpm db:push` (dev) or `pnpm db:migrate` (production)

## Query Patterns

```typescript
import { getDb, schema } from '~~/server/db'
import { eq, desc } from 'drizzle-orm'

const db = getDb()

// Select
const allTasks = await db.select().from(schema.tasks)
const task = await db.select().from(schema.tasks).where(eq(schema.tasks.id, id))

// Insert
const [newTask] = await db.insert(schema.tasks).values({ title }).returning()

// Update
await db.update(schema.tasks).set({ status: 'done' }).where(eq(schema.tasks.id, id))

// Delete
await db.delete(schema.tasks).where(eq(schema.tasks.id, id))
```

## Migration Commands

```bash
pnpm db:generate   # Generate migration after schema changes
pnpm db:migrate    # Apply migrations (production)
pnpm db:push       # Push schema directly (dev only)
pnpm db:studio     # View database in browser
```

## Important

- Never edit files in `server/db/migrations/` manually
- Always generate migrations for schema changes
- Keep `shared/types/index.ts` in sync with schema changes
- Use transactions for multi-table operations
- All user-scoped tables have `userId` FK for multi-tenancy
- `drizzle.config.ts` reads `process.env.NUXT_DATABASE_URL` (exception to the runtime config rule — it's a CLI tool)
