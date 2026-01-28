import { readFile, readdir, writeFile } from 'fs/promises'
import { join, basename } from 'path'
import { eq, isNull } from 'drizzle-orm'
import { getDb } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { getVaultRoot, toRelativePath } from './path-validator'
import { parseFrontmatter, stringifyFrontmatter, extractTitle, computeContentHash, isBinaryFile, getMimeType } from './frontmatter'
import { isDbAvailable } from './db-state'

// Default frontmatter values for new documents
const DEFAULT_FRONTMATTER = {
  tags: [] as string[],
  shared: false
}

export async function syncDocument(absolutePath: string): Promise<void> {
  if (!isDbAvailable()) return

  const db = getDb()
  const relativePath = toRelativePath(absolutePath)
  const filename = basename(absolutePath)

  // Skip hidden files
  if (filename.startsWith('.')) return

  let fileContent: string
  try {
    fileContent = await readFile(absolutePath, 'utf-8')
  } catch {
    console.error(`[sync] Failed to read file: ${relativePath}`)
    return
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
    }
    return
  }

  const { metadata: initialMetadata, body: bodyContent } = parseFrontmatter(fileContent)
  let metadata = initialMetadata
  const title = extractTitle(metadata, bodyContent, filename)

  // For new documents without frontmatter, add defaults
  const needsDefaults = !existing && Object.keys(metadata).length === 0

  if (needsDefaults) {
    // Merge defaults into metadata
    metadata = { ...DEFAULT_FRONTMATTER }

    // Write frontmatter back to file
    const newContent = stringifyFrontmatter(metadata, bodyContent)
    try {
      await writeFile(absolutePath, newContent, 'utf-8')
      fileContent = newContent
    } catch (err) {
      console.error(`[sync] Failed to write frontmatter to ${relativePath}:`, err)
    }
  }

  const contentHash = computeContentHash(fileContent)

  if (existing) {
    if (existing.contentHash !== contentHash) {
      await db.update(schema.documents).set({
        title,
        content: bodyContent,
        contentHash,
        tags: Array.isArray(metadata.tags) ? metadata.tags as string[] : existing.tags,
        syncedAt: new Date(),
        modifiedAt: new Date()
      }).where(eq(schema.documents.id, existing.id))
    }
  } else {
    await db.insert(schema.documents).values({
      path: relativePath,
      title,
      content: bodyContent,
      contentHash,
      tags: Array.isArray(metadata.tags) ? metadata.tags as string[] : [],
      shared: metadata.shared === true,
      fileType: 'markdown',
      syncedAt: new Date()
    })
  }
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
  if (!isDbAvailable()) return { added: 0, updated: 0, removed: 0 }

  const db = getDb()
  const vaultRoot = getVaultRoot()
  const stats = { added: 0, updated: 0, removed: 0 }
  const foundPaths = new Set<string>()

  async function scanDir(dir: string): Promise<void> {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
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
        await syncDocument(fullPath)
      }
    }
  }

  await scanDir(vaultRoot)

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
