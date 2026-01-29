import { randomBytes } from 'crypto'
import { writeFileSync } from 'fs'
import { join } from 'path'

/**
 * Generates an API token on server startup for CLI tools.
 * The token is written to .api-token file in the project root
 * and set in the runtime environment.
 */
export default defineNitroPlugin(() => {
  // Skip if token already set via environment variable
  if (process.env.SECOND_BRAIN_API_TOKEN) {
    console.log('[api-token] Using existing SECOND_BRAIN_API_TOKEN from environment')
    return
  }

  // Generate a secure random token
  const token = randomBytes(32).toString('hex')

  // Set in process environment for auth middleware
  process.env.SECOND_BRAIN_API_TOKEN = token

  // Write to file for CLI tools to read
  const tokenPath = join(process.cwd(), '.api-token')
  try {
    writeFileSync(tokenPath, token, { mode: 0o600 }) // Read/write only for owner
    console.log(`[api-token] Generated API token, written to ${tokenPath}`)
  } catch (err) {
    console.error('[api-token] Failed to write token file:', err)
  }
})
