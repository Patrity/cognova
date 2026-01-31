---
tags: []
shared: false
---
# Secrets Management

Secrets Management provides a secure, encrypted key-value store for storing sensitive data such as API keys, tokens, and credentials that can be used by skills, integrations, and other system features.

## Overview

The Secrets feature enables users to:

- Store sensitive values with AES-256-GCM encryption
- Organize secrets with descriptive keys and optional descriptions
- Manage secrets through a web UI in the Settings page
- Access secrets programmatically via REST API

All secret values are encrypted at rest in the database and can only be decrypted by the server using the master encryption key.

## Security Architecture

### Encryption Details

| Property | Value |
|----------|-------|
| Algorithm | AES-256-GCM |
| Key Derivation | scrypt |
| IV Size | 16 bytes (randomly generated per secret) |
| Authentication | GCM auth tag (prevents tampering) |

### How Encryption Works

1. **Key Derivation**: The encryption key is derived from `BETTER_AUTH_SECRET` environment variable using scrypt with a fixed salt
2. **Encryption**: Each secret value is encrypted with a unique random IV (initialization vector)
3. **Storage**: The encrypted ciphertext, auth tag, and IV are stored in the database
4. **Decryption**: Only the server can decrypt values using the derived key

```
┌─────────────────────────────────────────────────────────────────┐
│                     Encryption Flow                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  BETTER_AUTH_SECRET ──► scrypt(salt) ──► 256-bit key            │
│                                              │                   │
│  plaintext + random IV ─────────────────────►│                   │
│                                              ▼                   │
│                                         AES-256-GCM              │
│                                              │                   │
│                                              ▼                   │
│                                   encrypted + auth_tag           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Security Considerations

1. **Master Key Protection**: The `BETTER_AUTH_SECRET` environment variable is the master key for all secrets. Protect it carefully.

2. **No Value Exposure in Listing**: The GET `/api/secrets` endpoint never returns encrypted values - only metadata (key, description, timestamps).

3. **Authenticated Access**: All API endpoints require authentication (session-based or API token).

4. **GCM Authentication**: The auth tag ensures encrypted values cannot be tampered with without detection.

5. **Unique IVs**: Each secret uses a unique randomly-generated IV, ensuring identical plaintext values produce different ciphertext.

## Database Schema

The secrets table stores encrypted key-value pairs:

```sql
CREATE TABLE secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  encrypted_value TEXT NOT NULL,
  iv TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT REFERENCES user(id) ON DELETE SET NULL
);
```

### Schema Definition (Drizzle)

Located in `/server/db/schema.ts`:

```typescript
export const secrets = pgTable('secrets', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  encryptedValue: text('encrypted_value').notNull(),
  iv: text('iv').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' })
})

export const secretsRelations = relations(secrets, ({ one }) => ({
  creator: one(user, { fields: [secrets.createdBy], references: [user.id] })
}))
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `key` | TEXT | Unique identifier in SCREAMING_SNAKE_CASE (e.g., `MY_API_KEY`) |
| `encryptedValue` | TEXT | AES-256-GCM encrypted value with auth tag (hex encoded) |
| `iv` | TEXT | Initialization vector for decryption (hex encoded) |
| `description` | TEXT | Optional human-readable description |
| `createdAt` | TIMESTAMPTZ | Creation timestamp |
| `updatedAt` | TIMESTAMPTZ | Last modification timestamp |
| `createdBy` | TEXT | User ID of creator (nullable) |

## API Endpoints

All endpoints are located under `/server/api/secrets/`.

### List Secrets

Returns all secrets with metadata only (no values).

```
GET /api/secrets
```

**Response:**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "key": "GITHUB_TOKEN",
      "description": "Personal access token for GitHub API",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "key": "OPENAI_API_KEY",
      "description": "OpenAI API key for AI features",
      "createdAt": "2024-01-14T09:00:00Z",
      "updatedAt": "2024-01-14T09:00:00Z"
    }
  ]
}
```

### Get Secret Value

Retrieves and decrypts a specific secret by key.

```
GET /api/secrets/:key
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | string (path) | The secret key (e.g., `GITHUB_TOKEN`) |

**Response (200):**

```json
{
  "data": {
    "key": "GITHUB_TOKEN",
    "value": "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }
}
```

**Response (404):**

```json
{
  "statusCode": 404,
  "message": "Secret with key \"UNKNOWN_KEY\" not found"
}
```

### Create Secret

Creates a new encrypted secret.

```
POST /api/secrets
```

**Request Body:**

```json
{
  "key": "GITHUB_TOKEN",
  "value": "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "description": "Personal access token for GitHub API"
}
```

**Validation Rules:**

- `key` is required and must be in SCREAMING_SNAKE_CASE format (regex: `^[A-Z][A-Z0-9_]*$`)
- `key` must be 255 characters or less
- `key` must be unique
- `value` is required

**Response (200):**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "key": "GITHUB_TOKEN",
    "description": "Personal access token for GitHub API",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Response (400 - Invalid Key Format):**

```json
{
  "statusCode": 400,
  "message": "Key must be SCREAMING_SNAKE_CASE (e.g., MY_API_KEY)"
}
```

**Response (409 - Duplicate Key):**

```json
{
  "statusCode": 409,
  "message": "Secret with key \"GITHUB_TOKEN\" already exists"
}
```

### Update Secret

Updates an existing secret's value and/or description.

```
PUT /api/secrets/:key
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | string (path) | The secret key to update |

**Request Body:**

```json
{
  "value": "ghp_new_token_value",
  "description": "Updated description"
}
```

Both fields are optional. Omit `value` to keep the current encrypted value and only update the description.

**Response (200):**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "key": "GITHUB_TOKEN",
    "description": "Updated description",
    "updatedAt": "2024-01-16T14:00:00Z"
  }
}
```

**Response (404):**

```json
{
  "statusCode": 404,
  "message": "Secret with key \"UNKNOWN_KEY\" not found"
}
```

### Delete Secret

Permanently deletes a secret.

```
DELETE /api/secrets/:key
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | string (path) | The secret key to delete |

**Response (200):**

```json
{
  "data": {
    "deleted": true
  }
}
```

**Response (404):**

```json
{
  "statusCode": 404,
  "message": "Secret with key \"UNKNOWN_KEY\" not found"
}
```

## Crypto Utilities

The encryption functions are located in `/server/utils/crypto.ts`:

```typescript
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const SALT = 'second-brain-secrets-salt'

function deriveKey(): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) throw new Error('BETTER_AUTH_SECRET not set')
  return scryptSync(secret, SALT, 32)
}

export function encryptSecret(plaintext: string): { encrypted: string, iv: string } {
  const key = deriveKey()
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')

  return {
    encrypted: encrypted + ':' + authTag,
    iv: iv.toString('hex')
  }
}

export function decryptSecret(encrypted: string, ivHex: string): string {
  const key = deriveKey()
  const iv = Buffer.from(ivHex, 'hex')
  const [ciphertext, authTag] = encrypted.split(':')

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(Buffer.from(authTag!, 'hex'))

  const decryptedBuf = Buffer.concat([
    decipher.update(Buffer.from(ciphertext!, 'hex')),
    decipher.final()
  ])
  return decryptedBuf.toString('utf8')
}
```

### Function Reference

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `encryptSecret` | `plaintext: string` | `{ encrypted: string, iv: string }` | Encrypts a value and returns ciphertext + IV |
| `decryptSecret` | `encrypted: string, ivHex: string` | `string` | Decrypts a value using stored IV |

## Frontend UI

Secrets are managed through the Settings page at `/settings`, under the "Secrets" tab.

### Location

`/app/pages/settings.vue`

### Features

- **List View**: Displays all secrets in a table with key, description, and last updated date
- **Add Secret**: Modal form to create new secrets with key, value, and optional description
- **Edit Secret**: Modal form to update value and/or description (key cannot be changed)
- **Delete Secret**: Confirmation modal before permanent deletion

### UI Components Used

| Component | Purpose |
|-----------|---------|
| `UTabs` | Tab navigation between Account, Secrets, and App settings |
| `UTable` | Display secrets list |
| `UModal` | Create/edit and delete confirmation dialogs |
| `UForm` / `UFormField` | Form handling |
| `UInput` | Text inputs (password type for value field) |
| `UButton` | Actions (add, edit, delete, submit) |

### State Management

The frontend uses local reactive state (no composable):

```typescript
interface Secret {
  id: string
  key: string
  description: string | null
  createdAt: string
  updatedAt: string
}

const secretsData = ref<Secret[]>([])
const secretsLoading = ref(false)
const secretModal = ref(false)
const secretDeleteConfirm = ref(false)
const secretToDelete = ref<Secret | null>(null)
const secretSaving = ref(false)
const editingSecret = ref<Secret | null>(null)

const secretForm = reactive({
  key: '',
  value: '',
  description: ''
})
```

## Usage in Skills and Hooks

Secrets can be accessed by skills, cron agents, and other server-side features that need credentials.

### Example: Fetching a Secret in Server Code

```typescript
import { getDb } from '~~/server/db'
import { decryptSecret } from '~~/server/utils/crypto'

async function getGitHubToken(): Promise<string | null> {
  const db = getDb()

  const secret = await db.query.secrets.findFirst({
    where: (s, { eq }) => eq(s.key, 'GITHUB_TOKEN')
  })

  if (!secret) return null

  return decryptSecret(secret.encryptedValue, secret.iv)
}
```

### Example: Using in a Cron Agent Prompt

Cron agents can reference secrets in their prompts, and the system can inject the decrypted values at runtime:

```
Use the GitHub API with token from secrets to check for new issues.
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BETTER_AUTH_SECRET` | Yes | Master key used to derive encryption key. Generate with `openssl rand -base64 32` |

This variable is also used by the authentication system (BetterAuth), so it should already be configured.

## Best Practices

1. **Use Descriptive Keys**: Choose clear, descriptive keys like `GITHUB_PERSONAL_TOKEN` instead of `TOKEN1`

2. **Add Descriptions**: Always add descriptions to help identify what each secret is for

3. **Rotate Secrets**: Periodically update secret values, especially after team member departures

4. **Backup Master Key**: Keep the `BETTER_AUTH_SECRET` backed up securely - losing it means losing access to all encrypted secrets

5. **Minimal Access**: Only retrieve secret values when needed; use the list endpoint for UI display

6. **Audit Trail**: The `createdBy` field tracks who created each secret for accountability

## Limitations

1. **No Key Renaming**: Secret keys cannot be changed after creation. Delete and recreate if needed.

2. **No Versioning**: Previous values are not retained when updated.

3. **Single User**: Currently, all users can access all secrets. Per-user or per-project secrets may be added in the future.

4. **Server-Side Only**: Secret values can only be decrypted on the server. Frontend code cannot access raw values.

## Related Files

| File | Purpose |
|------|---------|
| `/server/db/schema.ts` | Database schema definition |
| `/server/utils/crypto.ts` | Encryption/decryption functions |
| `/server/api/secrets/index.get.ts` | List secrets endpoint |
| `/server/api/secrets/index.post.ts` | Create secret endpoint |
| `/server/api/secrets/[key].get.ts` | Get secret value endpoint |
| `/server/api/secrets/[key].put.ts` | Update secret endpoint |
| `/server/api/secrets/[key].delete.ts` | Delete secret endpoint |
| `/app/pages/settings.vue` | Settings page with Secrets tab |
