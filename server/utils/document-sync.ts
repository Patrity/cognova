import { readFile, readdir, writeFile } from 'fs/promises'
import { join, basename } from 'path'
import { eq, isNull } from 'drizzle-orm'
import { getDb } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { getVaultRoot, toRelativePath } from './path-validator'
import { parseFrontmatter, stringifyFrontmatter, extractTitle, computeContentHash, isBinaryFile, getFileType, getMimeType } from './frontmatter'
import { isDbAvailable } from './db-state'

// Default frontmatter values for new documents
const DEFAULT_FRONTMATTER = {
  tags: [] as string[],
  shared: false
}

export type SyncResult = 'added' | 'updated' | 'restored' | 'unchanged' | 'skipped'

export async function syncDocument(absolutePath: string): Promise<SyncResult> {
  if (!isDbAvailable()) return 'skipped'

  const db = getDb()
  const relativePath = toRelativePath(absolutePath)
  const filename = basename(absolutePath)

  // Skip hidden files
  if (filename.startsWith('.')) return 'skipped'

  let fileContent: string
  try {
    fileContent = await readFile(absolutePath, 'utf-8')
  } catch {
    console.error(`[sync] Failed to read file: ${relativePath}`)
    return 'skipped'
  }

  const isBinary = isBinaryFile(filename)

  const [existing] = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.path, relativePath))
    .limit(1)

  if (isBinary) {
    if (!existing) {
      await db.insert(schema.documents).values({
        path: relativePath,
        title: filename,
        fileType: 'binary',
        mimeType: getMimeType(filename),
        syncedAt: new Date()
      })
      return 'added'
    } else if (existing.deletedAt) {
      // Restore previously deleted binary file
      await db.update(schema.documents).set({
        deletedAt: null,
        syncedAt: new Date()
      }).where(eq(schema.documents.id, existing.id))
      return 'restored'
    }
    return 'unchanged'
  }

  const fileType = getFileType(filename)
  const isMarkdown = fileType === 'markdown'

  let metadata: Record<string, unknown> = {}
  let bodyContent = fileContent

  if (isMarkdown) {
    const parsed = parseFrontmatter(fileContent)
    metadata = parsed.metadata
    bodyContent = parsed.body

    // For new markdown documents without frontmatter, add defaults
    const needsDefaults = !existing && Object.keys(metadata).length === 0

    if (needsDefaults) {
      metadata = { ...DEFAULT_FRONTMATTER }

      const newContent = stringifyFrontmatter(metadata, bodyContent)
      try {
        await writeFile(absolutePath, newContent, 'utf-8')
        fileContent = newContent
      } catch (err) {
        console.error(`[sync] Failed to write frontmatter to ${relativePath}:`, err)
      }
    }
  }

  const title = extractTitle(metadata, bodyContent, filename)
  const contentHash = computeContentHash(fileContent)

  if (existing) {
    const contentChanged = existing.contentHash !== contentHash
    const wasDeleted = existing.deletedAt !== null

    // Update if content changed OR document was previously deleted (restore it)
    if (contentChanged || wasDeleted) {
      await db.update(schema.documents).set({
        title,
        content: bodyContent,
        contentHash,
        tags: isMarkdown && Array.isArray(metadata.tags) ? metadata.tags as string[] : existing.tags,
        deletedAt: null, // Clear deletion flag - file exists on disk
        syncedAt: new Date(),
        modifiedAt: new Date()
      }).where(eq(schema.documents.id, existing.id))
      return wasDeleted ? 'restored' : 'updated'
    }
    return 'unchanged'
  }

  await db.insert(schema.documents).values({
    path: relativePath,
    title,
    content: bodyContent,
    contentHash,
    tags: isMarkdown && Array.isArray(metadata.tags) ? metadata.tags as string[] : [],
    shared: isMarkdown && metadata.shared === true,
    fileType,
    syncedAt: new Date()
  })
  return 'added'
}

export async function markDocumentDeleted(absolutePath: string): Promise<void> {
  if (!isDbAvailable()) return

  const db = getDb()
  const relativePath = toRelativePath(absolutePath)

  await db.update(schema.documents).set({
    deletedAt: new Date(),
    modifiedAt: new Date()
  }).where(eq(schema.documents.path, relativePath))
}

export async function handleDocumentMove(oldPath: string, newPath: string): Promise<void> {
  if (!isDbAvailable()) return

  const db = getDb()
  const oldRelative = toRelativePath(oldPath)
  const newRelative = toRelativePath(newPath)

  await db.update(schema.documents).set({
    path: newRelative,
    modifiedAt: new Date()
  }).where(eq(schema.documents.path, oldRelative))
}

export async function fullSync(): Promise<{ added: number, updated: number, removed: number }> {
  if (!isDbAvailable()) {
    console.log('[sync] Database not available for full sync')
    return { added: 0, updated: 0, removed: 0 }
  }

  const db = getDb()
  const vaultRoot = getVaultRoot()
  const stats = { added: 0, updated: 0, removed: 0 }
  const foundPaths = new Set<string>()

  async function scanDir(dir: string): Promise<void> {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch (err) {
      console.error(`[sync] Failed to read directory ${dir}:`, err)
      return
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue

      const fullPath = join(dir, entry.name)

      if (entry.isDirectory()) {
        await scanDir(fullPath)
      } else if (entry.isFile()) {
        const relativePath = toRelativePath(fullPath)
        foundPaths.add(relativePath)
        try {
          const result = await syncDocument(fullPath)
          if (result === 'added') stats.added++
          else if (result === 'updated' || result === 'restored') stats.updated++
        } catch (err) {
          console.error(`[sync] Failed to sync ${relativePath}:`, err)
        }
      }
    }
  }

  console.log(`[sync] Starting full sync of ${vaultRoot}`)
  await scanDir(vaultRoot)
  console.log(`[sync] Scanned ${foundPaths.size} files`)

  // Mark documents not found on disk as deleted
  const dbDocs = await db
    .select({ id: schema.documents.id, path: schema.documents.path })
    .from(schema.documents)
    .where(isNull(schema.documents.deletedAt))

  for (const doc of dbDocs) {
    if (!foundPaths.has(doc.path)) {
      await db.update(schema.documents).set({
        deletedAt: new Date()
      }).where(eq(schema.documents.id, doc.id))
      stats.removed++
    }
  }

  return stats
}
