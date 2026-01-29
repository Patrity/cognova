import { waitForDb } from '../utils/db-state'
import { initCronScheduler } from '../services/cron-scheduler'
import { cleanupOrphanedRuns } from '../utils/agent-cleanup'

export default defineNitroPlugin(async () => {
  const dbAvailable = await waitForDb()
  if (!dbAvailable) {
    console.log('[cron-agents] Database not available, skipping scheduler')
    return
  }

  try {
    // Clean up any orphaned runs from previous server shutdown
    const { cancelled, fixed } = await cleanupOrphanedRuns()
    if (cancelled > 0 || fixed > 0) {
      console.log(`[cron-agents] Cleanup: ${cancelled} orphaned runs cancelled, ${fixed} runs fixed`)
    }

    const count = await initCronScheduler()
    if (count > 0) {
      console.log(`[cron-agents] Initialized ${count} scheduled agents`)
    }
  } catch (error) {
    console.error('[cron-agents] Failed to initialize scheduler:', error)
  }
})
