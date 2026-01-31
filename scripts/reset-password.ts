/**
 * Reset Password Script
 *
 * Usage:
 *   npx tsx scripts/reset-password.ts
 *
 * Environment:
 *   DATABASE_URL - Database connection string (required)
 */

import 'dotenv/config'
import { eq, and } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
// Use better-auth's password utility
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

import * as schema from '../server/db/schema'

const email = 'admin@example.com'
const newPassword = 'changeme123'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

// Create database connection
const connectionString = process.env.DATABASE_URL
const isNeon = connectionString.includes('neon.tech')

const queryClient = postgres(connectionString, {
  ssl: isNeon ? 'require' : false,
  max: 1
})

const db = drizzle(queryClient, { schema })

// Create auth instance (same as create-admin.ts)
const auth = betterAuth({
  database: drizzleAdapter(db, {
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
  }
})

async function resetPassword() {
  console.log(`Resetting password for: ${email}`)

  try {
    // Find the user
    const users = await db.select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, email))
      .limit(1)

    if (users.length === 0) {
      console.error(`User not found: ${email}`)
      process.exit(1)
    }

    const userId = users[0].id
    console.log(`Found user ID: ${userId}`)

    // Use better-auth's internal context to hash and update password
    // Access the password hashing from better-auth internals
    const ctx = await auth.$context
    const hashedPassword = await ctx.password.hash(newPassword)

    // Update the account password
    await db.update(schema.account)
      .set({
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(and(
        eq(schema.account.userId, userId),
        eq(schema.account.providerId, 'credential')
      ))

    console.log('Password reset successfully!')
    console.log(`  Email: ${email}`)
    console.log(`  New password: ${newPassword}`)
  } catch (error) {
    console.error('Error resetting password:', error)
  }

  await queryClient.end()
  process.exit(0)
}

resetPassword()
