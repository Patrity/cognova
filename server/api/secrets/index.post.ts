import { getDb } from '~~/server/db'
import { secrets } from '~~/server/db/schema'
import { encryptSecret } from '~~/server/utils/crypto'

interface CreateSecretInput {
  key: string
  value: string
  description?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateSecretInput>(event)

  if (!body.key?.trim())
    throw createError({ statusCode: 400, message: 'Key is required' })

  if (!body.value)
    throw createError({ statusCode: 400, message: 'Value is required' })

  // Validate key format: SCREAMING_SNAKE_CASE
  if (!/^[A-Z][A-Z0-9_]*$/.test(body.key))
    throw createError({ statusCode: 400, message: 'Key must be SCREAMING_SNAKE_CASE (e.g., MY_API_KEY)' })

  if (body.key.length > 255)
    throw createError({ statusCode: 400, message: 'Key must be 255 characters or less' })

  const db = getDb()
  const userId = event.context.user?.id

  // Check for duplicate key
  const existing = await db.query.secrets.findFirst({
    where: (s, { eq }) => eq(s.key, body.key)
  })

  if (existing) {
    throw createError({
      statusCode: 409,
      message: `Secret with key "${body.key}" already exists`
    })
  }

  const { encrypted, iv } = encryptSecret(body.value)

  const [result] = await db.insert(secrets).values({
    key: body.key,
    encryptedValue: encrypted,
    iv,
    description: body.description?.trim() || null,
    createdBy: userId
  }).returning({
    id: secrets.id,
    key: secrets.key,
    description: secrets.description,
    createdAt: secrets.createdAt
  })

  return { data: result }
})
