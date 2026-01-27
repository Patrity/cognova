# Data Models

## Neon PostgreSQL Schema

Serverless PostgreSQL via Neon. Connection via `DATABASE_URL` environment variable.

### Tasks

```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'blocked')),
    priority INTEGER DEFAULT 0,
    project TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_project ON tasks(project);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
```

### Reminders

```sql
CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
    notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reminders_remind_at ON reminders(remind_at) WHERE NOT notified;
```

### Future: Vector Search (pgvector)

Only add if vault grows large enough to need semantic search:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE note_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path TEXT NOT NULL UNIQUE,
    title TEXT,
    content_hash TEXT,
    embedding vector(384),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_note_embeddings_vector ON note_embeddings
    USING ivfflat (embedding vector_cosine_ops);
```

## File System (Vault)

Files are stored on the filesystem, not in the database. The vault is bind-mounted into the container at `/vault`.

### File Entry Type

```typescript
interface FileEntry {
  name: string           // "meeting-notes.md"
  path: string           // "/inbox/meeting-notes.md"
  type: 'file' | 'directory'
  size?: number          // bytes (files only)
  modifiedAt?: Date
  children?: FileEntry[] // directories only (when recursive)
}
```

### Vault Structure

```
/vault/
├── inbox/           # Quick captures, unsorted
├── areas/           # Ongoing responsibilities
│   ├── health/
│   ├── finance/
│   └── career/
├── projects/        # Active projects
├── resources/       # Reference material
├── archive/         # Completed/inactive
└── .claude/         # Claude Code config (hidden in UI by default)
    ├── CLAUDE.md
    ├── commands/
    └── settings.json
```

## Conversations (Claude Code Sessions)

Claude Code stores session data locally. The API reads from `.claude/projects/` directory.

```typescript
interface Conversation {
  id: string              // Session ID
  startedAt: Date
  endedAt?: Date
  messageCount: number
  summary?: string        // First user message or generated summary
  messages: Message[]     // Full transcript (on detail view)
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}
```

Note: Conversation data is read-only from Claude Code's local storage. We don't store it in Neon.

## TypeScript Types

```typescript
// === Tasks ===

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked'

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: number
  project?: string
  dueDate?: Date
  tags: string[]
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

export interface CreateTaskInput {
  title: string
  description?: string
  project?: string
  dueDate?: string
  priority?: number
  tags?: string[]
}

export interface TaskFilters {
  status?: TaskStatus | TaskStatus[]
  project?: string
  dueBefore?: Date
  dueAfter?: Date
  tags?: string[]
}

// === Reminders ===

export interface Reminder {
  id: string
  taskId?: string
  message: string
  remindAt: Date
  notified: boolean
  createdAt: Date
}

// === Files ===

export interface FileEntry {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  modifiedAt?: Date
  children?: FileEntry[]
}

export interface FileContent {
  path: string
  content: string
  modifiedAt: Date
}

// === Conversations ===

export interface Conversation {
  id: string
  startedAt: Date
  endedAt?: Date
  messageCount: number
  summary?: string
}

export interface ConversationDetail extends Conversation {
  messages: ConversationMessage[]
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

// === API ===

export interface ApiResponse<T> {
  data?: T
  error?: string
}
```

## Environment Variables

```bash
# Neon database (required)
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/second_brain?sslmode=require

# Vault path (required)
VAULT_PATH=/vault

# Notifications (optional)
GOTIFY_URL=https://gotify.yourdomain.com
GOTIFY_TOKEN=your-app-token
```

## Neon Serverless Driver

```typescript
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

// Query with template literals (auto-parameterized)
const tasks = await sql`
  SELECT * FROM tasks
  WHERE status = ${status}
  AND project = ${project}
`

// Insert
await sql`
  INSERT INTO tasks (title, project, due_date, priority)
  VALUES (${title}, ${project}, ${dueDate}, ${priority})
`
```

