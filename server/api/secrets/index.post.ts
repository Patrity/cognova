import { getDb, schema } from '~~/server/db'
import { encrypt } from '~~/server/utils/crypto'

export default defineEventHandler(async (event) => {
  const userId = event.context.user.id
  const body = await readBody(event)

  if (!body.key || typeof body.key !== 'string')
    throw createError({ statusCode: 400, message: 'key is required' })

  if (!body.value || typeof body.value !== 'string')
    throw createError({ statusCode: 400, message: 'value is required' })

  if (!/^[A-Z][A-Z0-9_]*$/.test(body.key))
    throw createError({ statusCode: 400, message: 'Key must be SCREAMING_SNAKE_CASE (e.g. MY_API_KEY)' })

  const db = getDb()
  const { encrypted, iv } = encrypt(body.value)

  const [result] = await db.insert(schema.secrets)
    .values({
      userId,
      key: body.key,
      encryptedValue: encrypted,
      iv
    })
    .returning({
      id: schema.secrets.id,
      key: schema.secrets.key,
      createdAt: schema.secrets.createdAt
    })

  return { data: result }
})
