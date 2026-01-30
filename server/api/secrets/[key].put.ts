import { getDb } from '~~/server/db'
import { secrets } from '~~/server/db/schema'
import { encryptSecret } from '~~/server/utils/crypto'
import { eq } from 'drizzle-orm'

interface UpdateSecretInput {
  value?: string
  description?: string
}

export default defineEventHandler(async (event) => {
  const key = getRouterParam(event, 'key')

  if (!key)
    throw createError({ statusCode: 400, message: 'Key is required' })

  const body = await readBody<UpdateSecretInput>(event)
  const db = getDb()

  const existing = await db.query.secrets.findFirst({
    where: (s, { eq }) => eq(s.key, key)
  })

  if (!existing)
    throw createError({ statusCode: 404, message: `Secret with key "${key}" not found` })

  const updateData: Record<string, unknown> = {
    updatedAt: new Date()
  }

  if (body.value) {
    const { encrypted, iv } = encryptSecret(body.value)
    updateData.encryptedValue = encrypted
    updateData.iv = iv
  }

  if (body.description !== undefined) {
    updateData.description = body.description?.trim() || null
  }

  const [result] = await db.update(secrets)
    .set(updateData)
    .where(eq(secrets.key, key))
    .returning({
      id: secrets.id,
      key: secrets.key,
      description: secrets.description,
      updatedAt: secrets.updatedAt
    })

  return { data: result }
})
