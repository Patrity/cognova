export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()

  const checks: Record<string, unknown> = {
    databaseUrl: config.databaseUrl,
    betterAuthSecret: config.betterAuthSecret,
    betterAuthUrl: config.betterAuthUrl,
    encryptionKey: config.encryptionKey
  }

  const missing = Object.entries(checks)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    console.error(`[env] Missing required runtime config: ${missing.join(', ')}`)
    console.error('[env] Set NUXT_DATABASE_URL, NUXT_BETTER_AUTH_SECRET, NUXT_BETTER_AUTH_URL in .env')
    throw new Error(`Missing required config: ${missing.join(', ')}`)
  }

  console.log('[env] Environment validated')
})
