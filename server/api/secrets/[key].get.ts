import { getDb } from '~~/server/db'
import { decryptSecret } from '~~/server/utils/crypto'

export default defineEventHandler(async (event) => {
  const key = getRouterParam(event, 'key')

  if (!key) {
    throw createError({
      statusCode: 400,
      message: 'Key is required'
    })
  }

  const db = getDb()

  const secret = await db.query.secrets.findFirst({
    where: (s, { eq }) => eq(s.key, key)
  })

  if (!secret) {
    throw createError({
      statusCode: 404,
      message: `Secret with key "${key}" not found`
    })
  }

  const value = decryptSecret(secret.encryptedValue, secret.iv)

  return { data: { key: secret.key, value } }
})
