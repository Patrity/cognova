import { getDb, schema } from '~~/server/db'
import { eq } from 'drizzle-orm'
import { getAuth } from '~~/server/utils/auth'

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig()
  const email = config.adminEmail || 'admin@example.com'
  const password = config.adminPassword || 'changeme123'
  const name = config.adminName || 'Admin'

  try {
    const db = getDb()
    const existing = await db.select().from(schema.user).where(eq(schema.user.email, email)).limit(1)

    if (existing.length > 0) return

    await getAuth().api.signUpEmail({
      body: { email, password, name }
    })

    // Set admin role
    await db.update(schema.user)
      .set({ role: 'admin' })
      .where(eq(schema.user.email, email))

    console.log(`[auth] Admin user created: ${email}`)
  } catch (error) {
    console.error('[auth] Failed to create admin user:', error)
  }
})
