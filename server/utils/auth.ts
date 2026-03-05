import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { getDb, schema } from '~~/server/db'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _auth: any = null

export function getAuth(): ReturnType<typeof betterAuth> {
  if (!_auth) {
    const config = useRuntimeConfig()
    const baseURL = config.betterAuthUrl || 'http://localhost:3000'

    _auth = betterAuth({
      baseURL,
      secret: config.betterAuthSecret,
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
        expiresIn: 60 * 60 * 24 * 7,
        updateAge: 60 * 60 * 24
      },
      advanced: {
        useSecureCookies: baseURL.startsWith('https://'),
        crossSubDomainCookies: {
          enabled: true
        }
      },
      trustedOrigins: [baseURL]
    })
  }
  return _auth
}
