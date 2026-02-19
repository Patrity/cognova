import { eq } from 'drizzle-orm'
import { waitForDb } from '~~/server/utils/db-state'
import { getDb } from '~~/server/db'
import * as schema from '~~/server/db/schema'

const REGISTRY_URL = 'https://raw.githubusercontent.com/Patrity/cognova-skills/main/registry.json'
const SYNC_INTERVAL_MS = 30 * 60 * 1000 // 30 minutes

interface RegistryEntry {
  name: string
  description: string
  version: string
  author: string
  tags: string[]
  requiresSecrets: string[]
  files: string[]
  updatedAt: string
}

async function syncRegistry() {
  try {
    const response = await fetch(REGISTRY_URL)
    if (!response.ok) {
      console.warn(`[skills-catalog] Failed to fetch registry: ${response.status}`)
      return
    }

    const entries: RegistryEntry[] = await response.json()
    if (!Array.isArray(entries)) {
      console.warn('[skills-catalog] Invalid registry format')
      return
    }

    const db = getDb()
    const now = new Date()

    for (const entry of entries) {
      if (!entry.name || !entry.description || !entry.version) continue

      await db.insert(schema.skillsCatalog)
        .values({
          name: entry.name,
          description: entry.description,
          version: entry.version,
          author: entry.author || '',
          tags: entry.tags || [],
          requiresSecrets: entry.requiresSecrets || [],
          files: entry.files || [],
          updatedAt: new Date(entry.updatedAt || now),
          syncedAt: now
        })
        .onConflictDoUpdate({
          target: schema.skillsCatalog.name,
          set: {
            description: entry.description,
            version: entry.version,
            author: entry.author || '',
            tags: entry.tags || [],
            requiresSecrets: entry.requiresSecrets || [],
            files: entry.files || [],
            updatedAt: new Date(entry.updatedAt || now),
            syncedAt: now
          }
        })
    }

    // Remove skills no longer in registry
    const catalogItems = await db.query.skillsCatalog.findMany()
    const registryNames = new Set(entries.map(e => e.name))
    for (const item of catalogItems) {
      if (!registryNames.has(item.name)) {
        await db.delete(schema.skillsCatalog)
          .where(eq(schema.skillsCatalog.id, item.id))
      }
    }

    console.log(`[skills-catalog] Synced ${entries.length} skills from registry`)
  } catch (error) {
    console.warn('[skills-catalog] Registry sync failed:', error)
  }
}

let syncTimer: ReturnType<typeof setInterval> | null = null

export default defineNitroPlugin(async (nitroApp) => {
  const dbAvailable = await waitForDb(10000)
  if (!dbAvailable) {
    console.log('[skills-catalog] Database not available, skipping')
    return
  }

  // Initial sync after a short delay
  setTimeout(() => syncRegistry(), 10000)

  // Periodic sync
  syncTimer = setInterval(() => syncRegistry(), SYNC_INTERVAL_MS)

  nitroApp.hooks.hook('close', () => {
    if (syncTimer) {
      clearInterval(syncTimer)
      syncTimer = null
    }
    console.log('[skills-catalog] Cleanup complete')
  })
})
