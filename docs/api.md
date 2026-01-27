# API Design

REST API for file operations, tasks, and WebSocket for terminal.

## File System API

### List Directory

```
GET /api/fs/list?path=/inbox
```

```typescript
// Response
{
  "data": [
    {
      "name": "2026-01-14-meeting-notes.md",
      "path": "/inbox/2026-01-14-meeting-notes.md",
      "type": "file",
      "size": 1234,
      "modifiedAt": "2026-01-14T10:30:00Z"
    },
    {
      "name": "ideas",
      "path": "/inbox/ideas",
      "type": "directory",
      "children": [] // Only if recursive=true
    }
  ]
}
```

Query params:

- `path` (required): Directory path relative to vault root
- `recursive` (optional): Include nested children

### Read File

```
POST /api/fs/read
```

```typescript
// Request
{
  "path": "/inbox/2026-01-14-meeting-notes.md"
}

// Response
{
  "data": {
    "content": "# Meeting Notes\n\nDiscussed project timeline...",
    "path": "/inbox/2026-01-14-meeting-notes.md",
    "modifiedAt": "2026-01-14T10:30:00Z"
  }
}
```

### Write File

```
POST /api/fs/write
```

```typescript
// Request
{
  "path": "/inbox/new-note.md",
  "content": "# New Note\n\nContent here..."
}

// Response
{
  "data": {
    "path": "/inbox/new-note.md",
    "created": true  // or false if updated existing
  }
}
```

### Create Directory

```
POST /api/fs/mkdir
```

```typescript
// Request
{
  "path": "/projects/new-project"
}
```

### Rename/Move File

```
POST /api/fs/rename
```

```typescript
// Request (rename)
{
  "oldPath": "/inbox/old-name.md",
  "newPath": "/inbox/new-name.md"
}

// Request (move)
{
  "oldPath": "/inbox/note.md",
  "newPath": "/projects/alpha/note.md"
}
```

### Delete File/Directory

```
POST /api/fs/delete
```

```typescript
// Request
{
  "path": "/inbox/unwanted-note.md"
}
```

## Tasks API

```
GET    /api/tasks                 List tasks (with filters)
POST   /api/tasks                 Create task
PUT    /api/tasks/:id             Update task
DELETE /api/tasks/:id             Delete task
```

### Query Parameters

### Examples

```typescript
// GET /api/tasks?status=todo&due=today
{
  "data": [
    {
      "id": "abc12345-...",
      "title": "Review Q1 budget report",
      "status": "todo",
      "project": "finance",
      "dueDate": "2026-01-14T09:00:00Z",
      "priority": 1
    }
  ]
}

// POST /api/tasks
{
  "title": "Call dentist",
  "project": "health",
  "dueDate": "2026-01-15",
  "priority": 0
}

// PUT /api/tasks/:id
{
  "status": "done"
}
```

## Reminders API

```
GET    /api/reminders             List upcoming reminders
POST   /api/reminders             Create reminder
DELETE /api/reminders/:id         Delete reminder
```

## Conversations API

List and view Claude Code session history.

```
GET    /api/conversations         List past sessions
GET    /api/conversations/:id     Get session details/transcript
```

```typescript
// GET /api/conversations
{
  "data": [
    {
      "id": "session-abc123",
      "startedAt": "2026-01-14T09:00:00Z",
      "endedAt": "2026-01-14T09:45:00Z",
      "messageCount": 24,
      "summary": "Worked on authentication refactor"
    }
  ]
}
```

Note: Session data comes from Claude Code's local storage (`.claude/` directory).

## WebSocket: Terminal

```
WS /api/terminal
```

### Protocol

```typescript
// Client → Server
{ type: 'input', data: string }           // Terminal input
{ type: 'resize', cols: number, rows: number }

// Server → Client
{ type: 'output', data: string }          // Terminal output
{ type: 'connected' }                     // Session ready
{ type: 'history', data: string }         // Replay buffer on reconnect
```

### Connection Flow

1. Client connects to WebSocket
2. Server spawns PTY with `bash` in vault directory
3. Bidirectional streaming
4. On disconnect, PTY stays alive (configurable timeout)
5. On reconnect, replay recent output buffer

### Implementation

```typescript
// server/routes/terminal.ts
import * as pty from 'node-pty'

const sessions = new Map<string, IPty>()
const outputBuffers = new Map<string, string[]>()

export default defineWebSocketHandler({
  open(peer) {
    const vaultPath = process.env.VAULT_PATH || '/vault'
    const sessionId = peer.id

    // Check for existing session to reconnect
    let shell = sessions.get(sessionId)

    if (!shell) {
      shell = pty.spawn('bash', [], {
        name: 'xterm-256color',
        cwd: vaultPath,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
        },
        cols: 80,
        rows: 24,
      })

      sessions.set(sessionId, shell)
      outputBuffers.set(sessionId, [])

      shell.onData((data) => {
        // Buffer recent output for reconnection
        const buffer = outputBuffers.get(sessionId)!
        buffer.push(data)
        if (buffer.length > 1000) buffer.shift()

        peer.send(JSON.stringify({ type: 'output', data }))
      })

      shell.onExit(() => {
        sessions.delete(sessionId)
        outputBuffers.delete(sessionId)
      })
    } else {
      // Reconnecting - replay buffer
      const buffer = outputBuffers.get(sessionId)
      if (buffer?.length) {
        peer.send(JSON.stringify({ type: 'history', data: buffer.join('') }))
      }
    }

    peer.send(JSON.stringify({ type: 'connected' }))
  },

  message(peer, message) {
    const msg = JSON.parse(message.text())
    const shell = sessions.get(peer.id)

    if (!shell) return

    if (msg.type === 'input') {
      shell.write(msg.data)
    } else if (msg.type === 'resize') {
      shell.resize(msg.cols, msg.rows)
    }
  },

  close(peer) {
    // Don't kill immediately - allow reconnection
    // Could add timeout here to cleanup stale sessions
  },
})
```

## Environment Variables

```bash
# Neon database
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/second_brain?sslmode=require

# Vault location
VAULT_PATH=/vault

# Notifications
GOTIFY_URL=https://gotify.yourdomain.com
GOTIFY_TOKEN=your-app-token
```

## Neon Serverless Driver

```typescript
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

// Query
const tasks = await sql`SELECT * FROM tasks WHERE status = 'todo'`

// Parameterized insert (safe from injection)
await sql`
  INSERT INTO tasks (title, project, due_date)
  VALUES (${title}, ${project}, ${dueDate})
`
```

## Path Validation

All file system operations validate paths to prevent directory traversal:

```typescript
// server/utils/path-validator.ts
import { resolve, relative } from 'path'

const VAULT_ROOT = process.env.VAULT_PATH || '/vault'

export function validatePath(requestedPath: string): string {
  // Resolve to absolute path within vault
  const resolved = resolve(VAULT_ROOT, requestedPath.replace(/^\//, ''))
  const rel = relative(VAULT_ROOT, resolved)

  // Prevent traversal outside vault
  if (rel.startsWith('..') || !resolved.startsWith(VAULT_ROOT)) {
    throw createError({
      statusCode: 403,
      message: 'Path outside vault directory'
    })
  }

  return resolved
}
```

