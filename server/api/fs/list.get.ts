import { readdir, stat } from 'fs/promises'
import { join } from 'path'
import type { FileEntry } from '~/../../shared/types'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const requestedPath = (query.path as string) || '/'
  const recursive = query.recursive === 'true'

  const absolutePath = validatePath(requestedPath)

  try {
    const entries = await readdir(absolutePath, { withFileTypes: true })
    const result: FileEntry[] = []

    for (const entry of entries) {
      // Skip hidden files/folders (starting with .)
      if (entry.name.startsWith('.')) continue

      const entryPath = join(absolutePath, entry.name)
      const stats = await stat(entryPath)

      const fileEntry: FileEntry = {
        name: entry.name,
        path: toRelativePath(entryPath),
        type: entry.isDirectory() ? 'directory' : 'file',
        modifiedAt: stats.mtime
      }

      if (entry.isFile()) {
        fileEntry.size = stats.size
      }

      if (entry.isDirectory() && recursive) {
        // Recursively get children
        const children = await getDirectoryContents(entryPath)
        fileEntry.children = children
      }

      result.push(fileEntry)
    }

    // Sort: directories first, then alphabetically
    result.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    return { data: result }
  } catch (error: unknown) {
    const err = error as NodeJS.ErrnoException
    if (err.code === 'ENOENT') {
      throw createError({
        statusCode: 404,
        message: 'Directory not found'
      })
    }
    throw createError({
      statusCode: 500,
      message: 'Failed to list directory'
    })
  }
})

async function getDirectoryContents(dirPath: string): Promise<FileEntry[]> {
  const entries = await readdir(dirPath, { withFileTypes: true })
  const result: FileEntry[] = []

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue

    const entryPath = join(dirPath, entry.name)
    const stats = await stat(entryPath)

    const fileEntry: FileEntry = {
      name: entry.name,
      path: toRelativePath(entryPath),
      type: entry.isDirectory() ? 'directory' : 'file',
      modifiedAt: stats.mtime
    }

    if (entry.isFile()) {
      fileEntry.size = stats.size
    }

    if (entry.isDirectory()) {
      fileEntry.children = await getDirectoryContents(entryPath)
    }

    result.push(fileEntry)
  }

  result.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return result
}
