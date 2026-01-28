import { count } from 'drizzle-orm'
import { getDb, schema } from './index'
import { auth } from '../utils/auth'

const DEFAULT_USER = {
  name: process.env.ADMIN_NAME || 'Admin',
  email: process.env.ADMIN_EMAIL || 'admin@example.com',
  password: process.env.ADMIN_PASSWORD || 'changeme123'
}

export async function seedIfEmpty(): Promise<boolean> {
  const db = getDb()

  const [result] = await db.select({ value: count() }).from(schema.user)
  const userCount = result?.value ?? 0

  if (userCount > 0) {
    // console.log(`[seed] Found ${userCount} existing user(s), skipping seed`)
    return false
  }

  console.log('[seed] No users found, creating default user...')

  try {
    const response = await auth.api.signUpEmail({
      body: {
        name: DEFAULT_USER.name,
        email: DEFAULT_USER.email,
        password: DEFAULT_USER.password
      }
    })

    if (response.user) {
      console.log(`[seed] Created default user: ${DEFAULT_USER.email}`)
      console.log(`[seed] Created default password: ${DEFAULT_USER.password}`)
      console.log('[seed] ⚠️  Change the default password after first login!')
      return true
    } else {
      console.error('[seed] Failed to create default user')
      return false
    }
  } catch (error) {
    console.error('[seed] Error creating default user:', error)
    return false
  }
}
