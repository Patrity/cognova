import { eq } from 'drizzle-orm'
import { getDb, schema } from '../../db'
import { auth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const body = await readBody<{ email: string }>(event)

  if (!body.email) {
    throw createError({
      statusCode: 400,
      message: 'Email is required'
    })
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(body.email)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid email format'
    })
  }

  const db = getDb()

  // Check if email is already taken by another user
  const existingUser = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.email, body.email))
    .limit(1)

  if (existingUser.length > 0 && existingUser[0]!.id !== session.user.id) {
    throw createError({
      statusCode: 409,
      message: 'Email is already in use'
    })
  }

  // Update the user's email directly
  await db
    .update(schema.user)
    .set({ email: body.email })
    .where(eq(schema.user.id, session.user.id))

  return { success: true, email: body.email }
})
