/**
 * Create Admin User Script
 *
 * Usage:
 *   pnpm auth:create-admin
 *
 * Environment:
 *   ADMIN_EMAIL    - Admin email (default: admin@localhost)
 *   ADMIN_PASSWORD - Admin password (default: changeme)
 *   ADMIN_NAME     - Admin display name (default: Admin)
 *   DATABASE_URL   - Database connection string (required)
 */

import 'dotenv/config'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

// Schema imports (relative to avoid Nuxt alias issues)
import * as schema from '../server/db/schema'

const email = process.env.ADMIN_EMAIL || 'admin@example.com'
const password = process.env.ADMIN_PASSWORD || 'changeme'
const name = process.env.ADMIN_NAME || 'Admin'

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

// Create auth instance
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

async function createAdmin() {
  console.log(`Creating admin user: ${email}`)

  try {
    const result = await auth.api.signUpEmail({
      body: {
        name,
        email,
        password
      }
    })

    if (result.user) {
      console.log('Admin user created successfully!')
      console.log(`  ID: ${result.user.id}`)
      console.log(`  Email: ${result.user.email}`)
      console.log(`  Name: ${result.user.name}`)
    } else {
      console.error('Failed to create admin user:', result)
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('unique') || error.message.includes('duplicate')) {
        console.log(`Admin user already exists: ${email}`)
      } else {
        console.error('Error creating admin:', error.message)
      }
    } else {
      console.error('Unknown error:', error)
    }
  }

  await queryClient.end()
  process.exit(0)
}

createAdmin()
