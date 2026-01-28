---
tags: []
shared: false
---
# AI Conversation History

Persist Claude Code conversation history to the database for browsing, searching, and continuity.

## Overview

Claude Code stores conversation transcripts locally in `.claude/projects/`. This feature:
- Syncs conversation metadata to the database
- Enables browsing past conversations in the UI
- Provides search across conversation history
- Preserves context across sessions

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Claude Code                           │
│  ~/.claude/projects/{project-id}/                        │
│  └── {session-id}.jsonl                                  │
└────────────────────┬────────────────────────────────────┘
                     │ File watcher
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Conversation Sync Service                   │
│  - Watch for new/updated session files                   │
│  - Parse JSONL transcripts                               │
│  - Extract metadata and messages                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    PostgreSQL                            │
│  conversations: id, session_id, summary, dates          │
│  messages: id, conversation_id, role, content, ts       │
└─────────────────────────────────────────────────────────┘
```

## Schema

```typescript
// server/db/schema.ts
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: text('session_id').notNull().unique(),
  projectPath: text('project_path'),
  summary: text('summary'),
  firstMessage: text('first_message'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  messageCount: integer('message_count').default(0),
  tokenCount: integer('token_count'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

export const conversationMessages = pgTable('conversation_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  tokenCount: integer('token_count'),
  toolCalls: jsonb('tool_calls')
})

// Index for searching message content
// CREATE INDEX idx_messages_content ON conversation_messages USING GIN (to_tsvector('english', content));
```

## Sync Service

```typescript
// server/services/conversation-sync.ts
import { watch } from 'chokidar'
import { readFile } from 'fs/promises'
import { db, schema } from '../db'

const CLAUDE_PATH = process.env.HOME + '/.claude/projects'

export function startConversationSync() {
  const watcher = watch(`${CLAUDE_PATH}/**/*.jsonl`, {
    persistent: true,
    ignoreInitial: false
  })

  watcher.on('add', syncConversation)
  watcher.on('change', syncConversation)

  console.log('Conversation sync started')
}

async function syncConversation(filePath: string) {
  const sessionId = extractSessionId(filePath)
  const projectPath = extractProjectPath(filePath)

  const content = await readFile(filePath, 'utf-8')
  const messages = parseJsonlTranscript(content)

  if (messages.length === 0) return

  // Upsert conversation
  const [conv] = await db.insert(schema.conversations)
    .values({
      sessionId,
      projectPath,
      summary: generateSummary(messages),
      firstMessage: messages[0]?.content?.slice(0, 200),
      startedAt: messages[0]?.timestamp,
      endedAt: messages[messages.length - 1]?.timestamp,
      messageCount: messages.length
    })
    .onConflictDoUpdate({
      target: schema.conversations.sessionId,
      set: {
        summary: generateSummary(messages),
        endedAt: messages[messages.length - 1]?.timestamp,
        messageCount: messages.length,
        updatedAt: new Date()
      }
    })
    .returning()

  // Sync messages (upsert based on position)
  await syncMessages(conv.id, messages)
}

function parseJsonlTranscript(content: string): Message[] {
  return content
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      try {
        return JSON.parse(line)
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

function generateSummary(messages: Message[]): string {
  // Use first user message as summary
  const firstUser = messages.find(m => m.role === 'user')
  if (firstUser) {
    return firstUser.content.slice(0, 100)
  }
  return 'Conversation'
}
```

## API Endpoints

### List Conversations

```typescript
// server/api/conversations/index.get.ts
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = parseInt(query.page as string) || 1
  const limit = parseInt(query.limit as string) || 20

  const conversations = await db.select()
    .from(schema.conversations)
    .orderBy(desc(schema.conversations.startedAt))
    .limit(limit)
    .offset((page - 1) * limit)

  const total = await db.select({ count: count() })
    .from(schema.conversations)

  return {
    conversations,
    pagination: {
      page,
      limit,
      total: total[0].count
    }
  }
})
```

### Get Conversation Detail

```typescript
// server/api/conversations/[id].get.ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  const conversation = await db.select()
    .from(schema.conversations)
    .where(eq(schema.conversations.id, id))
    .limit(1)

  if (!conversation[0]) {
    throw createError({ statusCode: 404 })
  }

  const messages = await db.select()
    .from(schema.conversationMessages)
    .where(eq(schema.conversationMessages.conversationId, id))
    .orderBy(schema.conversationMessages.timestamp)

  return {
    ...conversation[0],
    messages
  }
})
```

### Search Conversations

```typescript
// server/api/conversations/search.get.ts
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const searchTerm = query.q as string

  const results = await db.execute(sql`
    SELECT DISTINCT c.*
    FROM conversations c
    JOIN conversation_messages m ON m.conversation_id = c.id
    WHERE m.content ILIKE ${`%${searchTerm}%`}
       OR c.summary ILIKE ${`%${searchTerm}%`}
    ORDER BY c.started_at DESC
    LIMIT 20
  `)

  return { results }
})
```

## UI: Conversations Page

```vue
<!-- app/pages/conversations.vue -->
<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const { data: conversations, pending } = await useFetch('/api/conversations')
const selectedId = ref<string | null>(null)
const selectedConversation = ref(null)

async function selectConversation(id: string) {
  selectedId.value = id
  const { data } = await useFetch(`/api/conversations/${id}`)
  selectedConversation.value = data.value
}
</script>

<template>
  <UDashboardPanel
    id="conversation-list"
    :default-size="25"
    resizable
    class="hidden lg:flex"
  >
    <template #header>
      <UDashboardNavbar title="Conversations">
        <template #right>
          <UInput
            placeholder="Search..."
            icon="i-lucide-search"
            size="sm"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #default>
      <div class="divide-y divide-default">
        <button
          v-for="conv in conversations"
          :key="conv.id"
          class="w-full p-4 text-left hover:bg-muted"
          :class="{ 'bg-muted': selectedId === conv.id }"
          @click="selectConversation(conv.id)"
        >
          <div class="font-medium truncate">{{ conv.summary }}</div>
          <div class="text-sm text-dimmed">
            {{ formatDate(conv.startedAt) }}
          </div>
        </button>
      </div>
    </template>
  </UDashboardPanel>

  <UDashboardPanel id="conversation-detail" grow>
    <template #header>
      <UDashboardNavbar :title="selectedConversation?.summary || 'Select a conversation'" />
    </template>

    <template #default>
      <div v-if="selectedConversation" class="p-4 space-y-4">
        <div
          v-for="msg in selectedConversation.messages"
          :key="msg.id"
          :class="[
            'p-4 rounded-lg',
            msg.role === 'user' ? 'bg-primary/10 ml-8' : 'bg-muted mr-8'
          ]"
        >
          <div class="text-xs text-dimmed mb-2">
            {{ msg.role === 'user' ? 'You' : 'Claude' }}
          </div>
          <div class="prose prose-sm">{{ msg.content }}</div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
```

## Startup Integration

```typescript
// server/plugins/conversation-sync.ts
import { startConversationSync } from '../services/conversation-sync'

export default defineNitroPlugin(() => {
  if (process.env.DATABASE_URL) {
    startConversationSync()
  }
})
```

## Implementation Steps

1. [ ] Add conversations schema
2. [ ] Add messages schema
3. [ ] Generate migration
4. [ ] Create sync service
5. [ ] Add file watcher
6. [ ] Create list API endpoint
7. [ ] Create detail API endpoint
8. [ ] Create search API endpoint
9. [ ] Build conversations page
10. [ ] Add to navigation
11. [ ] Test with real sessions

## Dependencies

- Requires: database-init
- Blocks: None
- Related: search (can search conversations)
