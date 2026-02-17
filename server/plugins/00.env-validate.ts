/**
 * Validates required environment variables on server startup.
 * Runs before all other plugins to catch misconfigurations early.
 */
export default defineNitroPlugin(() => {
  const warnings: string[] = []
  const errors: string[] = []

  // Required for auth to function
  if (!process.env.BETTER_AUTH_SECRET) {
    errors.push('BETTER_AUTH_SECRET is not set. Auth will not work. Generate one with: openssl rand -base64 32')
  }

  // Required for file operations
  if (!process.env.VAULT_PATH) {
    errors.push('VAULT_PATH is not set. File browsing and document features will not work.')
  }

  // Optional but important
  if (!process.env.DATABASE_URL) {
    warnings.push('DATABASE_URL is not set. Database features (tasks, agents, conversations, memory) will be disabled.')
  }

  if (!process.env.BETTER_AUTH_URL) {
    warnings.push('BETTER_AUTH_URL is not set. Auth callbacks may not work correctly. Set to your app URL (e.g. http://localhost:3000).')
  }

  for (const w of warnings)
    console.warn(`[env] WARNING: ${w}`)

  if (errors.length > 0) {
    for (const e of errors)
      console.error(`[env] ERROR: ${e}`)

    console.error('[env] Fix the above errors in your .env file and restart.')
    console.error('[env] See .env.example for reference.')
  }
})
