import { homedir } from 'os'
import { join, dirname } from 'path'
import { existsSync, readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import type { SecondBrainMetadata } from './types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/** Directory where the npm package is installed (contains Claude/, app source, etc.) */
export function getPackageDir(): string {
  // When running from dist/cli/index.mjs, package root is two levels up
  return join(__dirname, '..', '..')
}

/** User's home directory */
export function getHomeDir(): string {
  return homedir()
}

/** Claude Code config directory */
export function getClaudeDir(): string {
  return join(homedir(), '.claude')
}

/** Path to the .cognova metadata file in the install directory */
export function getMetadataPath(installDir?: string): string {
  const dir = installDir || findInstallDir()
  return join(dir, '.cognova')
}

/** Read .cognova metadata from install directory */
export function readMetadata(installDir?: string): SecondBrainMetadata | null {
  try {
    const metaPath = getMetadataPath(installDir)
    if (!existsSync(metaPath))
      return null
    return JSON.parse(readFileSync(metaPath, 'utf-8'))
  } catch {
    return null
  }
}

/** Find the install directory from metadata in cwd or home */
export function findInstallDir(): string {
  // Check current working directory first
  const cwdMeta = join(process.cwd(), '.cognova')
  if (existsSync(cwdMeta)) {
    try {
      const meta: SecondBrainMetadata = JSON.parse(readFileSync(cwdMeta, 'utf-8'))
      // Always follow the installDir pointer if it exists
      if (meta.installDir && existsSync(meta.installDir))
        return meta.installDir
    } catch {
      // Unreadable metadata — assume cwd is the install dir
      return process.cwd()
    }
  }

  // Check home directory for a global pointer
  const homeMeta = join(homedir(), '.cognova')
  if (existsSync(homeMeta)) {
    try {
      const meta: SecondBrainMetadata = JSON.parse(readFileSync(homeMeta, 'utf-8'))
      if (meta.installDir && existsSync(meta.installDir))
        return meta.installDir
    } catch {
      // fall through
    }
  }

  return process.cwd()
}
