import { watch } from 'chokidar'
import { getVaultRoot } from '~~/server/utils/path-validator'
import { syncDocument, markDocumentDeleted, fullSync } from '~~/server/utils/document-sync'
import { waitForDb } from '~~/server/utils/db-state'

export default defineNitroPlugin(async (nitroApp) => {
  // Wait for database to be initialized
  const dbAvailable = await waitForDb()
  if (!dbAvailable) {
    console.log('[file-watcher] Database not available, skipping file watcher')
    return
  }

  const vaultRoot = getVaultRoot()
  console.log(`[file-watcher] Starting watcher on ${vaultRoot}`)

  // Full sync on startup
  try {
    const stats = await fullSync()
    if (stats.added + stats.removed + stats.updated > 0)
      console.log(`[file-watcher] Initial sync complete: ${stats.added} added, ${stats.removed} removed, ${stats.updated} updated`)
  } catch (error) {
    console.error('[file-watcher] Initial sync failed:', error)
  }

  // Debounce map for rapid changes
  const pending = new Map<string, NodeJS.Timeout>()

  function debounced(path: string, action: () => Promise<void>) {
    const existing = pending.get(path)
    if (existing) clearTimeout(existing)

    pending.set(path, setTimeout(async () => {
      pending.delete(path)
      try {
        await action()
      } catch (error) {
        console.error(`[file-watcher] Error processing ${path}:`, error)
      }
    }, 500))
  }

  // Start watching
  const watcher = watch(vaultRoot, {
    ignored: /(^|[/\\])\../, // Ignore dotfiles
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100
    }
  })

  watcher
    .on('add', path => debounced(path, () => syncDocument(path)))
    .on('change', path => debounced(path, () => syncDocument(path)))
    .on('unlink', path => debounced(path, () => markDocumentDeleted(path)))
    .on('error', error => console.error('[file-watcher] Error:', error))

  // Cleanup on shutdown
  nitroApp.hooks.hook('close', async () => {
    await watcher.close()
    console.log('[file-watcher] Watcher closed')
  })
})
