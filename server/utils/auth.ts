import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { getDb, schema } from '../db'

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  database: drizzleAdapter(getDb(), {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification
    }
  }),
  emailAndPassword: {
    enabled: true
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24 // Update session every 24 hours
  },
  advanced: {
    // For HTTP (non-HTTPS) access via IP/LAN, cookies must not require Secure flag
    useSecureCookies: process.env.BETTER_AUTH_URL?.startsWith('https://') ?? false
  },
  trustedOrigins: process.env.ACCESS_MODE === 'any'
    ? (request?: Request) => {
        const origin = request?.headers.get('origin')
        return origin ? [origin] : []
      }
    : process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []
})
