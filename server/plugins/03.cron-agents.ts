import { waitForDb } from '../utils/db-state'
import { initCronScheduler } from '../services/cron-scheduler'

export default defineNitroPlugin(async () => {
  const dbAvailable = await waitForDb()
  if (!dbAvailable) {
    console.log('[cron-agents] Database not available, skipping scheduler')
    return
  }

  try {
    const count = await initCronScheduler()
    if (count > 0) {
      console.log(`[cron-agents] Initialized ${count} scheduled agents`)
    }
  } catch (error) {
    console.error('[cron-agents] Failed to initialize scheduler:', error)
  }
})
