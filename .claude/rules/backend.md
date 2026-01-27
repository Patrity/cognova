---
paths: "server/**/*.ts"
---

# Backend Development Rules

## Directory Structure

```
server/
├── api/              # API routes (auto-registered)
│   ├── fs/           # File system operations
│   └── tasks/        # Task CRUD (when added)
├── routes/           # WebSocket and special routes
├── utils/            # Server utilities
└── middleware/       # Server middleware
```

## Types

Import shared types from `shared/types/`:

```typescript
import type { Task, FileEntry, ApiResponse } from '~~/shared/types'
```

Never duplicate type definitions - if a type is needed by both frontend and backend, it belongs in `shared/types/`.

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

  if (!body.path || typeof body.path !== 'string')
    throw createError({ statusCode: 400, message: 'path is required' })

  // ... rest of handler
})
```

## Error Handling

- Use `createError()` for HTTP errors
- Include meaningful error messages
- Log server errors but don't expose internals to clients

## Path Security

All file operations must validate paths stay within allowed directories:

```typescript
import { validatePath } from '~~/server/utils/path-validator'

const safePath = validatePath(userProvidedPath) // throws if invalid
```

## Environment Variables

Access via `process.env` or `useRuntimeConfig()`:

```typescript
const config = useRuntimeConfig()
const dbUrl = config.databaseUrl
```

Required env vars should be validated at startup, not per-request.
