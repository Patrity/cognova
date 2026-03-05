import { readdir, readFile } from 'fs/promises'
import { join, extname, basename } from 'path'
import { homedir } from 'os'
import type { AgentKnowledge, KnowledgeFile } from '~~/shared/types/agent'
import type { IKnowledgeLoader } from './types'

const CACHE_TTL_MS = 5 * 60 * 1000

interface CacheEntry {
  knowledge: AgentKnowledge
  loadedAt: number
}

function resolvePath(knowledgePath: string): string {
  if (knowledgePath.startsWith('~/'))
    return join(homedir(), knowledgePath.slice(2))
  return knowledgePath
}

function getFileType(ext: string): KnowledgeFile['type'] | null {
  switch (ext.toLowerCase()) {
    case '.md':
    case '.markdown':
      return 'markdown'
    case '.txt':
      return 'text'
    case '.json':
      return 'json'
    default:
      return null
  }
}

export class FilesystemKnowledgeLoader implements IKnowledgeLoader {
  private basePath: string
  private cache = new Map<string, CacheEntry>()

  constructor(knowledgePath: string) {
    this.basePath = resolvePath(knowledgePath)
  }

  async load(agentId: string): Promise<AgentKnowledge> {
    const cached = this.cache.get(agentId)
    if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS)
      return cached.knowledge

    const dirPath = join(this.basePath, agentId)
    const empty: AgentKnowledge = { files: [], text: '' }

    let entries: string[]
    try {
      entries = await readdir(dirPath)
    } catch {
      this.cache.set(agentId, { knowledge: empty, loadedAt: Date.now() })
      return empty
    }

    const files: KnowledgeFile[] = []
    const textParts: string[] = []

    for (const entry of entries) {
      const ext = extname(entry)
      const fileType = getFileType(ext)
      if (!fileType)
        continue

      try {
        const filePath = join(dirPath, entry)
        const raw = await readFile(filePath, 'utf-8')
        let content: unknown = raw

        if (fileType === 'json') {
          try {
            content = JSON.parse(raw)
          } catch {
            content = raw
          }
        }

        files.push({
          path: entry,
          name: basename(entry, ext),
          type: fileType,
          content,
          raw
        })

        textParts.push(`### ${entry}\n${raw}`)
      } catch (err) {
        console.warn(`[knowledge] Failed to read ${entry}:`, err)
      }
    }

    const knowledge: AgentKnowledge = {
      files,
      text: textParts.join('\n\n')
    }

    this.cache.set(agentId, { knowledge, loadedAt: Date.now() })
    return knowledge
  }

  invalidate(agentId: string): void {
    this.cache.delete(agentId)
  }

  invalidateAll(): void {
    this.cache.clear()
  }
}
