import { homedir } from 'os'
import { join } from 'path'
import type { SkillMeta, SkillFile } from '~~/shared/types'

const CORE_SKILLS = ['memory', 'task', 'project', 'secret', 'environment']

export function getSkillsDir(): string {
  return join(homedir(), '.claude', 'skills')
}

export function getInactiveSkillsDir(): string {
  return join(homedir(), '.claude', 'inactive-skills')
}

export function getSkillPath(name: string, active: boolean = true): string {
  const base = active ? getSkillsDir() : getInactiveSkillsDir()
  return join(base, name)
}

export function isCoreSkill(name: string): boolean {
  return CORE_SKILLS.includes(name)
}

/**
 * Parse SKILL.md YAML frontmatter into SkillMeta.
 * Handles both top-level and metadata-nested custom fields.
 */
export function parseSkillFrontmatter(content: string): SkillMeta {
  const defaults: SkillMeta = {
    name: '',
    description: '',
    version: '',
    author: '',
    tags: [],
    allowedTools: [],
    requiresSecrets: [],
    repository: '',
    installedFrom: '',
    disableModelInvocation: false,
    userInvocable: true,
    context: '',
    agent: ''
  }

  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match?.[1]) return defaults

  const yaml = match[1]
  const result = { ...defaults }

  // Simple YAML parser for flat + one-level nested keys
  let inMetadata = false
  for (const line of yaml.split('\n')) {
    // Check for metadata block
    if (line === 'metadata:') {
      inMetadata = true
      continue
    }

    // Nested under metadata (indented)
    if (inMetadata && /^\s{2}\S/.test(line)) {
      const nested = line.trim()
      const colonIdx = nested.indexOf(':')
      if (colonIdx === -1) continue
      const key = nested.slice(0, colonIdx).trim()
      const val = nested.slice(colonIdx + 1).trim()
      assignMetaField(result, key, val)
      continue
    }

    // End of metadata block if we hit a non-indented line
    if (inMetadata && /^\S/.test(line))
      inMetadata = false

    // Top-level key
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    const val = line.slice(colonIdx + 1).trim()
    assignTopLevelField(result, key, val)
  }

  return result
}

function assignTopLevelField(result: SkillMeta, key: string, val: string): void {
  switch (key) {
    case 'name':
      result.name = unquote(val)
      break
    case 'description':
      result.description = unquote(val)
      break
    case 'allowed-tools':
      result.allowedTools = val.split(',').map(s => s.trim()).filter(Boolean)
      break
    case 'disable-model-invocation':
      result.disableModelInvocation = val === 'true'
      break
    case 'user-invocable':
      result.userInvocable = val !== 'false'
      break
    case 'context':
      result.context = unquote(val)
      break
    case 'agent':
      result.agent = unquote(val)
      break
  }
}

function assignMetaField(result: SkillMeta, key: string, val: string): void {
  switch (key) {
    case 'version':
      result.version = unquote(val)
      break
    case 'author':
      result.author = unquote(val)
      break
    case 'tags':
      result.tags = parseYamlArray(val)
      break
    case 'requires-secrets':
      result.requiresSecrets = parseYamlArray(val)
      break
    case 'repository':
      result.repository = unquote(val)
      break
    case 'installed-from':
      result.installedFrom = unquote(val)
      break
  }
}

function unquote(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"'))
    || (s.startsWith('\'') && s.endsWith('\'')))
    return s.slice(1, -1)
  return s
}

function parseYamlArray(val: string): string[] {
  // Handle inline array: ["key1", "key2"] or [key1, key2]
  if (val.startsWith('[') && val.endsWith(']')) {
    const inner = val.slice(1, -1).trim()
    if (!inner) return []
    return inner.split(',').map(s => unquote(s.trim())).filter(Boolean)
  }
  return []
}

/**
 * Build a file tree for a skill directory.
 * Excludes __pycache__ and .pyc files.
 */
export async function buildSkillFileTree(dirPath: string): Promise<SkillFile[]> {
  const { readdir, stat } = await import('fs/promises')
  const entries = await readdir(dirPath).catch(() => [])
  const files: SkillFile[] = []

  for (const entry of entries) {
    if (entry === '__pycache__' || entry.endsWith('.pyc'))
      continue

    const fullPath = join(dirPath, entry)
    const stats = await stat(fullPath).catch(() => null)
    if (!stats) continue

    if (stats.isDirectory()) {
      const children = await buildSkillFileTree(fullPath)
      files.push({ name: entry, path: entry, type: 'directory', children })
    } else {
      files.push({ name: entry, path: entry, type: 'file' })
    }
  }

  // Sort: directories first, then alphabetical
  files.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return files
}

/**
 * Validate a skill name for filesystem safety.
 */
export function validateSkillName(name: string): string | null {
  if (!name || name.length > 64)
    return 'Name must be 1-64 characters'
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(name))
    return 'Name must start with a letter/digit and contain only lowercase letters, digits, hyphens, and underscores'
  if (name === '_lib')
    return '_lib is reserved'
  return null
}
