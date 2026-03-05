---
paths: "server/**/*.ts"
---

# Backend Development Rules

## Directory Structure

```
server/
├── api/              # API routes (auto-registered)
│   ├── auth/         # better-auth catch-all handler
│   ├── providers/    # Provider CRUD
│   ├── agents/       # Agent CRUD + install
│   ├── conversations/ # Chat + messages
│   ├── tasks/        # Task CRUD
│   ├── knowledge/    # Knowledge file operations
│   └── settings/     # App settings
├── routes/           # WebSocket and special routes
│   └── _ws/          # WebSocket routes (prefixed to avoid page collisions)
│       └── chat.ts   # Chat SSE/WS bridge
├── services/         # Business logic
│   ├── agent-executor.ts
│   └── cron-scheduler.ts
├── db/               # Drizzle ORM (schema, migrations, singleton)
├── plugins/          # Nitro startup plugins (00-env, 01-db, 02-admin-seed)
├── utils/            # Server utilities (auth singleton, encryption, etc.)
└── middleware/       # Server middleware (auth guard)
```

### WebSocket Route Collision Rule

Nitro `server/routes/` takes precedence over Nuxt pages. If a WebSocket
handler shares a name with a page route (e.g., `/chat`), place it under
`server/routes/_ws/` to avoid blocking the page. The client connects to
`/_ws/chat` instead of `/chat`.

### Server Imports

Use `~~/server/` aliases for imports within server code:

```typescript
// Good
import { getDb, schema } from '~~/server/db'
import { getAuth } from '~~/server/utils/auth'

// Bad
import { getDb } from '../db'
```

## Singleton Pattern

Server utilities that depend on runtime config use lazy singletons:

```typescript
let _instance: SomeType | null = null

export function getInstance() {
  if (!_instance) {
    const config = useRuntimeConfig()
    _instance = createSomething(config.someValue)
  }
  return _instance
}
```

This pattern is used by `getDb()` and `getAuth()`. Never create module-level instances that read runtime config — it won't be available at import time.

## Types

Import shared types from `shared/types/`:

```typescript
import type { Task, ApiResponse } from '~~/shared/types'
```

Never duplicate type definitions — if a type is needed by both frontend and backend, it belongs in `shared/types/`.

## API Route Patterns

### Naming Convention
- `GET` → `*.get.ts`
- `POST` → `*.post.ts`
- `PUT` → `*.put.ts`
- `DELETE` → `*.delete.ts`

### Response Format

Always return consistent API responses:

```typescript
// Success
return { data: result }

// Error
throw createError({
  statusCode: 400,
  message: 'Descriptive error message'
})
```

### Input Validation

Validate request bodies at the start of handlers:

```typescript
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.name || typeof body.name !== 'string')
    throw createError({ statusCode: 400, message: 'name is required' })

  // ... rest of handler
})
```

### Auth Context

The auth middleware populates `event.context.user` and `event.context.session` for authenticated routes:

```typescript
export default defineEventHandler(async (event) => {
  const userId = event.context.user.id
  // ...
})
```

## Environment Variables

Always use `useRuntimeConfig()` — never `process.env`:

```typescript
const config = useRuntimeConfig()
const dbUrl = config.databaseUrl
```

Required env vars are validated at startup in `server/plugins/00.env-validate.ts`.

## Error Handling

- Use `createError()` for HTTP errors
- Include meaningful error messages
- Log server errors but don't expose internals to clients
- Never silent-catch without at least `console.error`
