import { eq } from 'drizzle-orm'
import { waitForDb } from '../utils/db-state'
import { getDb, schema } from '../db'
import { stopAllAdapters } from '../bridge/registry'
import { startBridge } from '../bridge/lifecycle'

/**
 * Message Bridge plugin.
 * Initializes enabled bridge adapters after the database is ready.
 * Each adapter maintains its own connection/listener lifecycle.
 */
export default defineNitroPlugin(async (nitro) => {
  const dbAvailable = await waitForDb()
  if (!dbAvailable) {
    console.log('[bridge] Database not available, skipping bridge initialization')
    return
  }

  try {
    const db = getDb()
    const enabledBridges = await db.query.bridges.findMany({
      where: eq(schema.bridges.enabled, true)
    })

    if (enabledBridges.length === 0) {
      console.log('[bridge] No enabled bridges, skipping initialization')
      return
    }

    for (const bridge of enabledBridges)
      await startBridge(bridge)

    console.log(`[bridge] Initialized ${enabledBridges.length} bridge(s)`)

    // Graceful shutdown
    nitro.hooks.hook('close', async () => {
      await stopAllAdapters()
    })
  } catch (error) {
    console.error('[bridge] Failed to initialize bridge system:', error)
  }
})
