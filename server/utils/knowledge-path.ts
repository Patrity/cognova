import { readdir, stat } from 'fs/promises'
import { join, normalize } from 'path'
import { homedir } from 'os'
import type { FileTreeEntry } from '~~/shared/types'

/**
 * Resolve the knowledge base path from runtime config.
 * Handles ~/ expansion.
 */
export function resolveKnowledgeBase(): string {
  const config = useRuntimeConfig()
  const knowledgePath = config.knowledgePath as string
  if (knowledgePath.startsWith('~/'))
    return join(homedir(), knowledgePath.slice(2))
  return knowledgePath
}

/**
 * Validate and normalize a relative path within the knowledge base.
 * Returns the full absolute path. Throws on path traversal attempts.
 */
export function validateKnowledgePath(relativePath: string): string {
  const base = resolveKnowledgeBase()
  const normalized = normalize(join(base, relativePath))
  if (!normalized.startsWith(base))
    throw createError({ statusCode: 400, message: 'Invalid path' })
  return normalized
}

/**
 * Build a recursive file tree for a directory.
 * Excludes __pycache__ and .pyc files.
 */
export async function buildKnowledgeFileTree(dirPath: string, relativeTo?: string): Promise<FileTreeEntry[]> {
  const entries = await readdir(dirPath).catch(() => [])
  const files: FileTreeEntry[] = []

  for (const entry of entries) {
    if (entry === '__pycache__' || entry.endsWith('.pyc') || entry.startsWith('.'))
      continue

    const fullPath = join(dirPath, entry)
    const relPath = relativeTo ? join(relativeTo, entry) : entry
    const stats = await stat(fullPath).catch(() => null)
    if (!stats) continue

    if (stats.isDirectory()) {
      const children = await buildKnowledgeFileTree(fullPath, relPath)
      files.push({ name: entry, path: relPath, type: 'directory', children })
    } else {
      files.push({ name: entry, path: relPath, type: 'file' })
    }
  }

  // Sort: directories first, then alphabetical
  files.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return files
}
