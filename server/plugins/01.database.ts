import { warmupDb, closeDb } from '~~/server/db'

export default defineNitroPlugin(async (nitroApp) => {
  const connected = await warmupDb()
  if (!connected)
    console.warn('[db] Failed to connect — app may not function correctly')

  nitroApp.hooks.hook('close', async () => {
    await closeDb()
    console.log('[db] Connection closed')
  })
})
