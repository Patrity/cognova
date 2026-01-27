import { resolve, relative, join } from 'path'
import { existsSync } from 'fs'

function getDefaultVaultPath(): string {
  // Check common locations in order of preference
  const candidates = [
    process.env.VAULT_PATH,
    '/tmp/second-brain-vault',
    process.env.HOME ? join(process.env.HOME, 'Documents', 'vault') : null,
    process.cwd()
  ].filter(Boolean) as string[]

  for (const path of candidates) {
    if (existsSync(path)) {
      return path
    }
  }

  // Fallback to current working directory
  return process.cwd()
}

const VAULT_ROOT = getDefaultVaultPath()

export function getVaultRoot(): string {
  return VAULT_ROOT
}

export function validatePath(requestedPath: string): string {
  // Normalize the path - remove leading slash and resolve
  const normalizedPath = requestedPath.replace(/^\/+/, '')
  const resolved = resolve(VAULT_ROOT, normalizedPath)
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

export function toRelativePath(absolutePath: string): string {
  const rel = relative(VAULT_ROOT, absolutePath)
  return '/' + rel
}

export function joinVaultPath(...paths: string[]): string {
  return join(VAULT_ROOT, ...paths)
}
