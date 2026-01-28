---
tags: []
shared: false
---
# Document Metadata Layer

Store relational metadata about vault files in the database for search and organization.

## Overview

Files in the vault are the source of truth (SST), but storing metadata in the database enables:
- Full-text search across all documents
- Relational data (project, tags, links)
- Fast queries without filesystem scanning

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Vault (fs)    │────►│  File Watcher   │────►│   Database      │
│   ~/vault/      │     │   Service       │     │   documents     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │ SST                   │ Events                │ Metadata
        │                       │                       │
        ▼                       ▼                       ▼
   - Content              - Create                 - path (unique)
   - Structure            - Update                 - title
   - History (git)        - Delete                 - content (for FTS)
                          - Move                   - projectId
                                                   - tags[]
                                                   - createdAt
                                                   - modifiedAt
                                                   - hash (content)
```

## Schema

```typescript
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  path: text('path').notNull().unique(),  // Relative to vault root
  title: text('title'),                    // Extracted from content or filename
  content: text('content'),                // Full content for FTS
  contentHash: text('content_hash'),       // For change detection
  projectId: uuid('project_id').references(() => projects.id),
  tags: text('tags').array(),
  frontmatter: jsonb('frontmatter'),       // Parsed YAML frontmatter
  createdAt: timestamp('created_at').defaultNow(),
  modifiedAt: timestamp('modified_at'),
  syncedAt: timestamp('synced_at'),        // Last sync with filesystem
})
```

## File Watcher Service

Use `chokidar` or similar for filesystem events:

```typescript
// Events to handle
watcher.on('add', path => syncDocument(path))      // New file
watcher.on('change', path => syncDocument(path))   // Content changed
watcher.on('unlink', path => markDeleted(path))    // File deleted
```

## Considerations

### File Moves

Moving files is tricky because watcher sees it as delete + create:

```typescript
// Option 1: Debounce delete, check for matching content hash
// Option 2: Track pending deletes, match with creates by hash
// Option 3: Use rename event if available (platform-dependent)

async function handleMove(oldPath: string, newPath: string) {
  // Update path without triggering delete cascade
  await db.update(documents)
    .set({ path: newPath, modifiedAt: new Date() })
    .where(eq(documents.path, oldPath))
}
```

### Conflict Resolution

What happens when files change outside server control:

| Scenario | Resolution |
|----------|------------|
| File deleted while server down | Mark as `deletedAt`, don't hard delete |
| File moved while server down | Full resync on startup, match by hash |
| File modified while server down | Update content and hash on next sync |
| New files while server down | Discovered on startup scan |

### Startup Sync

On server start, reconcile database with filesystem:

```typescript
async function fullSync() {
  const dbDocs = await db.select().from(documents)
  const fsDocs = await scanVault()

  // Find orphaned DB records (file no longer exists)
  // Find new files (not in DB)
  // Find changed files (hash mismatch)
}
```

### Performance

- Index on `path` for lookups
- GIN index on `content` for full-text search
- Batch inserts during initial sync
- Debounce rapid file changes

## Dependencies

- Requires: database-init
- Enables: search, document-project linking
- Related: editor (auto-save triggers sync)

## Open Questions

- [ ] Should we store rendered HTML for faster preview?
- [ ] How to handle binary files (images, PDFs)?
- [ ] Should frontmatter override DB fields or vice versa?
- [ ] Soft delete vs hard delete for missing files?
