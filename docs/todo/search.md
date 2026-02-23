---
tags: []
shared: false
---
# Full-Text Search

> **Status:** Basic search is **done** — Cmd+K palette with task/document ILIKE search, navigation shortcuts, and action commands. This plan covers the **upgrade** to PostgreSQL full-text search (tsvector + GIN) and expanding search scope to all resources.

Search across vault files with full-text indexing and optional semantic search.

## What's Already Built

- `app/components/search/DashboardSearch.vue` — Cmd+K palette using Nuxt UI's `UDashboardSearch`
- `app/composables/useSearch.ts` — Debounced search across tasks and documents via ILIKE
- Tasks API (`/api/tasks?search=`) — ILIKE on title + description
- Documents API (`/api/documents?search=`) — ILIKE on title + content + path
- Memory API (`/api/memory/search?query=`) — ILIKE on content + sourceExcerpt with relevance scoring
- Navigation shortcuts (G D, G T, G O, G S) and action commands (create doc/task)

## What's Missing

- PostgreSQL tsvector columns + GIN indexes (currently uses ILIKE, which is slow on large datasets)
- Search across agents, conversations, memories, hooks, skills, bridges in the Cmd+K palette
- Content snippet previews in search results
- Vault file indexing (file_index table for non-DB files)

## Overview

Upgrade search to use PostgreSQL full-text indexing:
- Fast full-text search across all resources
- Relevance ranking with ts_rank
- Content snippets with ts_headline
- Optional: Semantic search with embeddings (future)

## Approaches

### Option 1: File-Based Search (Simple)

Use ripgrep or similar for fast file searching. No database required.

**Pros:**
- No indexing overhead
- Always up-to-date
- Simple implementation

**Cons:**
- Slower on large vaults
- No ranking/relevance
- Limited query syntax

### Option 2: PostgreSQL Full-Text Search (Recommended)

Index file contents in PostgreSQL with tsvector.

**Pros:**
- Fast queries
- Relevance ranking
- Rich query syntax
- Already have database

**Cons:**
- Requires index maintenance
- Storage overhead

### Option 3: Semantic Search with pgvector (Future)

Vector embeddings for meaning-based search.

**Pros:**
- Find related content
- Natural language queries

**Cons:**
- Requires embedding API
- Higher complexity
- Cost for embeddings

## Recommended: PostgreSQL Full-Text

## Schema Addition

```typescript
// server/db/schema.ts
export const fileIndex = pgTable('file_index', {
  id: uuid('id').primaryKey().defaultRandom(),
  path: text('path').notNull().unique(),
  title: text('title'),
  content: text('content'),
  contentHash: text('content_hash'),  // MD5 for change detection
  searchVector: tsvector('search_vector'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

// Create GIN index for fast search
// CREATE INDEX idx_file_search ON file_index USING GIN (search_vector);
```

## Indexing Service

```typescript
// server/services/search-indexer.ts
import { db, schema } from '../db'
import { readdir, readFile, stat } from 'fs/promises'
import { join } from 'path'
import { createHash } from 'crypto'

const VAULT_PATH = process.env.VAULT_PATH!

export async function indexVault() {
  const files = await getMarkdownFiles(VAULT_PATH)

  for (const filePath of files) {
    await indexFile(filePath)
  }
}

async function indexFile(absolutePath: string) {
  const relativePath = absolutePath.replace(VAULT_PATH, '')
  const content = await readFile(absolutePath, 'utf-8')
  const contentHash = createHash('md5').update(content).digest('hex')

  // Check if already indexed with same hash
  const existing = await db.select()
    .from(schema.fileIndex)
    .where(eq(schema.fileIndex.path, relativePath))
    .limit(1)

  if (existing[0]?.contentHash === contentHash) {
    return // No changes
  }

  // Extract title from first heading or filename
  const title = extractTitle(content, relativePath)

  // Upsert with full-text vector
  await db.insert(schema.fileIndex)
    .values({
      path: relativePath,
      title,
      content,
      contentHash,
      searchVector: sql`to_tsvector('english', ${title} || ' ' || ${content})`
    })
    .onConflictDoUpdate({
      target: schema.fileIndex.path,
      set: {
        title,
        content,
        contentHash,
        searchVector: sql`to_tsvector('english', ${title} || ' ' || ${content})`,
        updatedAt: new Date()
      }
    })
}

function extractTitle(content: string, path: string): string {
  const headingMatch = content.match(/^#\s+(.+)$/m)
  if (headingMatch) return headingMatch[1]

  // Fall back to filename
  const filename = path.split('/').pop() || ''
  return filename.replace('.md', '').replace(/-/g, ' ')
}

async function getMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = []

  async function walk(currentDir: string) {
    const entries = await readdir(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name)

      if (entry.isDirectory()) {
        // Skip hidden directories
        if (!entry.name.startsWith('.')) {
          await walk(fullPath)
        }
      } else if (entry.name.endsWith('.md')) {
        files.push(fullPath)
      }
    }
  }

  await walk(dir)
  return files
}
```

## Search API

```typescript
// server/api/search.get.ts
import { db, schema } from '../db'
import { sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const searchTerm = query.q as string

  if (!searchTerm || searchTerm.length < 2) {
    return { results: [] }
  }

  // PostgreSQL full-text search with ranking
  const results = await db.execute(sql`
    SELECT
      path,
      title,
      ts_rank(search_vector, plainto_tsquery('english', ${searchTerm})) as rank,
      ts_headline('english', content, plainto_tsquery('english', ${searchTerm}),
        'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20') as snippet
    FROM file_index
    WHERE search_vector @@ plainto_tsquery('english', ${searchTerm})
    ORDER BY rank DESC
    LIMIT 20
  `)

  return {
    query: searchTerm,
    count: results.length,
    results: results.map(r => ({
      path: r.path,
      title: r.title,
      rank: r.rank,
      snippet: r.snippet
    }))
  }
})
```

## UI Component

```vue
<!-- app/components/SearchModal.vue -->
<script setup lang="ts">
const open = defineModel<boolean>('open')
const query = ref('')
const results = ref([])
const loading = ref(false)

const debouncedSearch = useDebounceFn(async () => {
  if (query.value.length < 2) {
    results.value = []
    return
  }

  loading.value = true
  try {
    const data = await $fetch('/api/search', {
      query: { q: query.value }
    })
    results.value = data.results
  } finally {
    loading.value = false
  }
}, 300)

watch(query, debouncedSearch)

function handleSelect(path: string) {
  navigateTo(`/docs?file=${encodeURIComponent(path)}`)
  open.value = false
}
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-4">
        <UInput
          v-model="query"
          placeholder="Search files..."
          icon="i-lucide-search"
          autofocus
        />

        <div v-if="loading" class="py-8 text-center">
          <UIcon name="i-lucide-loader-2" class="animate-spin" />
        </div>

        <div v-else-if="results.length" class="mt-4 space-y-2 max-h-96 overflow-auto">
          <button
            v-for="result in results"
            :key="result.path"
            class="w-full text-left p-3 rounded hover:bg-muted"
            @click="handleSelect(result.path)"
          >
            <div class="font-medium">{{ result.title }}</div>
            <div class="text-sm text-dimmed">{{ result.path }}</div>
            <div
              v-if="result.snippet"
              class="text-sm mt-1"
              v-html="result.snippet"
            />
          </button>
        </div>

        <div v-else-if="query.length >= 2" class="py-8 text-center text-dimmed">
          No results found
        </div>
      </div>
    </template>
  </UModal>
</template>
```

## Keyboard Shortcut

```typescript
// app/composables/useSearch.ts
const searchOpen = ref(false)

// Open with Cmd+K / Ctrl+K
onMounted(() => {
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      searchOpen.value = true
    }
  })
})
```

## Index Maintenance

### On File Save

```typescript
// server/api/fs/write.post.ts
import { indexFile } from '../../services/search-indexer'

// After writing file
await indexFile(absolutePath)
```

### On File Delete

```typescript
// server/api/fs/delete.post.ts
await db.delete(schema.fileIndex)
  .where(eq(schema.fileIndex.path, relativePath))
```

### Background Reindex

```typescript
// server/tasks/reindex.ts
export default defineTask({
  meta: {
    name: 'search:reindex',
    description: 'Reindex all vault files'
  },
  async run() {
    await indexVault()
    return { result: 'Reindex complete' }
  }
})
```

## Implementation Steps

1. [x] Create SearchModal component (`search/DashboardSearch.vue`)
2. [x] Add Cmd+K shortcut (via `UDashboardSearchButton`)
3. [x] Add search to dashboard layout
4. [x] Basic search API for tasks and documents (ILIKE)
5. [ ] Add tsvector columns to tasks, documents, memory_chunks tables
6. [ ] Add GIN indexes on tsvector columns
7. [ ] Generate migration
8. [ ] Update search APIs to use `plainto_tsquery` + `ts_rank` instead of ILIKE
9. [ ] Add file_index table for vault files not in DB
10. [ ] Create indexing service for vault files
11. [ ] Hook indexing to file write/delete
12. [ ] Add search groups to Cmd+K palette: agents, conversations, memories, hooks
13. [ ] Add content snippet previews with `ts_headline`
14. [ ] Test with sample vault

## Future: Semantic Search

When ready for AI-powered search:

```typescript
// Add embeddings column
embedding: vector('embedding', { dimensions: 384 })

// Generate embeddings on index
const embedding = await generateEmbedding(content)

// Search by similarity
const similar = await db.execute(sql`
  SELECT path, title, 1 - (embedding <=> ${queryEmbedding}) as similarity
  FROM file_index
  ORDER BY embedding <=> ${queryEmbedding}
  LIMIT 10
`)
```

## Dependencies

- Requires: database-init
- Blocks: None
- Related: skills-system (vault-search skill)
