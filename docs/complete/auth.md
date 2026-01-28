---
title: Authentication
tags: []
project: null
shared: true
shareType: private
---
# Authentication

Basic authentication layer using BetterAuth with Drizzle integration. Single-user initially, designed for future multi-user expansion.

## Overview

Implement authentication to protect the application:

- Single admin user for initial release
- BetterAuth for session management
- Drizzle adapter for database storage
- Future: Multi-user with vault isolation

## Why BetterAuth?

- Native Drizzle integration
- Simple email/password auth
- Session-based (no JWT complexity)
- Easy to extend with OAuth later
- Active development, modern API

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser                              │
├─────────────────────────────────────────────────────────┤
│  Login Page ──► BetterAuth ──► Session Cookie            │
│                     │                                    │
│                     ▼                                    │
│              ┌─────────────┐                            │
│              │  Database   │                            │
│              │  - users    │                            │
│              │  - sessions │                            │
│              └─────────────┘                            │
│                     │                                    │
│                     ▼                                    │
│  Protected Routes (API + Pages)                         │
└─────────────────────────────────────────────────────────┘
```

## Dependencies

```bash
pnpm add better-auth
```

## Schema Extension

```typescript
// server/db/schema.ts (additions)
import { pgTable, text, uuid, timestamp, boolean } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false),
  name: text('name'),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'), // Hashed password for email/password auth
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

export const verifications = pgTable('verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})
```

## BetterAuth Config

```typescript
// server/utils/auth.ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '../db'
import * as schema from '../db/schema'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications
    }
  }),
  emailAndPassword: {
    enabled: true
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24 // Update session every 24 hours
  }
})
```

## API Handler

```typescript
// server/api/auth/[...all].ts
import { auth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  return auth.handler(toWebRequest(event))
})
```

## Middleware

```typescript
// server/middleware/auth.ts
import { auth } from '../utils/auth'

export default defineEventHandler(async (event) => {
  // Skip auth for public routes
  const publicPaths = ['/api/auth', '/api/health', '/_nuxt']
  if (publicPaths.some(p => event.path.startsWith(p))) {
    return
  }

  // Check session
  const session = await auth.api.getSession({
    headers: getHeaders(event)
  })

  if (!session) {
    // API requests get 401
    if (event.path.startsWith('/api/')) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized'
      })
    }
    // Page requests redirect to login
    return sendRedirect(event, '/login')
  }

  // Attach user to event context
  event.context.user = session.user
  event.context.session = session.session
})
```

## Frontend Client

```typescript
// app/composables/useAuth.ts
import { createAuthClient } from 'better-auth/vue'

export const authClient = createAuthClient({
  baseURL: '/api/auth'
})

export function useAuth() {
  const session = authClient.useSession()

  async function login(email: string, password: string) {
    return authClient.signIn.email({ email, password })
  }

  async function logout() {
    return authClient.signOut()
  }

  async function register(email: string, password: string, name?: string) {
    return authClient.signUp.email({ email, password, name })
  }

  return {
    session,
    user: computed(() => session.value?.user),
    isAuthenticated: computed(() => !!session.value),
    login,
    logout,
    register
  }
}
```

## Login Page

```vue
<!-- app/pages/login.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { login } = useAuth()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleSubmit() {
  loading.value = true
  error.value = ''

  const result = await login(email.value, password.value)

  if (result.error) {
    error.value = result.error.message
  } else {
    navigateTo('/')
  }

  loading.value = false
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center">
    <UCard class="w-full max-w-md">
      <template #header>
        <h1 class="text-xl font-semibold">Sign In</h1>
      </template>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <UFormField label="Email">
          <UInput v-model="email" type="email" required />
        </UFormField>

        <UFormField label="Password">
          <UInput v-model="password" type="password" required />
        </UFormField>

        <UAlert v-if="error" color="error" :title="error" />

        <UButton type="submit" block :loading="loading">
          Sign In
        </UButton>
      </form>
    </UCard>
  </div>
</template>
```

## Initial Admin Setup

For first run, create admin user via CLI or seed script:

```typescript
// scripts/create-admin.ts
import { db } from '../server/db'
import { users, accounts } from '../server/db/schema'
import { hashPassword } from 'better-auth'

const email = process.env.ADMIN_EMAIL || 'admin@localhost'
const password = process.env.ADMIN_PASSWORD || 'changeme'

async function createAdmin() {
  const hashedPassword = await hashPassword(password)

  await db.insert(users).values({
    email,
    name: 'Admin',
    emailVerified: true
  }).returning()

  const [user] = await db.select().from(users).where(eq(users.email, email))

  await db.insert(accounts).values({
    userId: user.id,
    accountId: user.id,
    providerId: 'credential',
    password: hashedPassword
  })

  console.log(`Admin user created: ${email}`)
}

createAdmin()
```

## Environment Variables

```bash
# Auth secret (generate with: openssl rand -base64 32)
BETTER_AUTH_SECRET=your-secret-here

# Initial admin (for first setup)
ADMIN_EMAIL=admin@localhost
ADMIN_PASSWORD=changeme
```

## Future: Multi-User

When ready to support multiple users:

```typescript
// Extend users table
export const users = pgTable('users', {
  // ... existing fields
  role: text('role', { enum: ['admin', 'user'] }).default('user'),
  vaultPath: text('vault_path') // e.g., "/users/{user-id}" or null for admin
})

// Vault isolation
function getUserVaultPath(user: User): string {
  if (user.role === 'admin') {
    return process.env.VAULT_PATH!
  }
  return join(process.env.VAULT_PATH!, 'users', user.id)
}
```

## Implementation Steps

1. [x] Install BetterAuth
2. [x] Add auth tables to schema
3. [x] Generate migration
4. [x] Create BetterAuth config
5. [x] Add API handler
6. [x] Create auth middleware
7. [x] Create useAuth composable
8. [x] Create login page
9. [x] Create auth layout
10. [x] Add admin seed script
11. [x] Test login flow
12. [x] Update .env.example

## Dependencies

- Requires: database-init
- Blocks: None (enables protected features)
- Related: Future multi-user vault isolation

---

## Completion Notes

**Completed:** 2026-01-28

### What Was Implemented

- BetterAuth with Drizzle adapter for PostgreSQL
- Email/password authentication with scrypt password hashing
- Session-based auth with 7-day expiry
- Server middleware protecting all routes except `/api/auth`, `/api/health`, `/_nuxt`, `/login`
- Login page with auth layout
- User dropdown in sidebar with logout
- Admin seed script (`pnpm auth:create-admin`)

### Changes from Original Plan

### Files Created

- `server/db/schema.ts` - Added user, session, account, verification tables
- `server/utils/auth.ts` - BetterAuth configuration
- `server/api/auth/[...all].ts` - Auth API handler
- `server/middleware/auth.ts` - Route protection middleware
- `app/composables/useAuth.ts` - Client-side auth composable
- `app/layouts/auth.vue` - Centered layout for login page
- `app/pages/login.vue` - Login form
- `scripts/create-admin.ts` - Admin user seed script
- `server/drizzle/migrations/0002_clean_colossus.sql` - Auth tables migration

### Environment Variables Added

```bash
BETTER_AUTH_SECRET=  # Required - generate with: openssl rand -base64 32
BETTER_AUTH_URL=     # Required - base URL for callbacks
ADMIN_EMAIL=         # Optional - for create-admin script
ADMIN_PASSWORD=      # Optional - for create-admin script
ADMIN_NAME=          # Optional - for create-admin script
```

### Usage

```bash
# Create initial admin user
pnpm auth:create-admin

# Or with custom credentials
ADMIN_EMAIL=myemail@example.com ADMIN_PASSWORD=mysecurepassword pnpm auth:create-admin
```

