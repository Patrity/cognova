import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { getDb, schema } from '../db'

export const auth = betterAuth({
  // When behind a proxy, use the configured URL but BetterAuth will
  // auto-detect the actual protocol from X-Forwarded-Proto header
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
    // Use secure cookies only when the configured URL uses HTTPS
    useSecureCookies: process.env.BETTER_AUTH_URL?.startsWith('https://') ?? false,
    // Trust X-Forwarded-* headers from reverse proxy
    crossSubDomainCookies: {
      enabled: true
    }
  },
  trustedOrigins: process.env.ACCESS_MODE === 'any'
    ? (request?: Request) => {
        const origin = request?.headers.get('origin')
        return origin ? [origin] : []
      }
    : process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []
})
