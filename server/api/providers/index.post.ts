import { eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { encryptProviderConfig } from '~~/server/utils/provider-config'

export default defineEventHandler(async (event) => {
  const userId = event.context.user.id
  const body = await readBody(event)

  if (!body.name || typeof body.name !== 'string')
    throw createError({ statusCode: 400, message: 'name is required' })

  if (!body.typeId || typeof body.typeId !== 'string')
    throw createError({ statusCode: 400, message: 'typeId is required' })

  if (!body.configJson || typeof body.configJson !== 'object')
    throw createError({ statusCode: 400, message: 'configJson is required' })

  const db = getDb()

  const [providerType] = await db.select()
    .from(schema.providerTypes)
    .where(eq(schema.providerTypes.id, body.typeId))
    .limit(1)

  if (!providerType)
    throw createError({ statusCode: 400, message: 'Invalid provider type' })

  const encryptedConfig = encryptProviderConfig(body.configJson)

  const [provider] = await db.insert(schema.providers)
    .values({
      typeId: body.typeId,
      userId,
      name: body.name,
      configJson: encryptedConfig
    })
    .returning()

  return { data: { ...provider, type: providerType } }
})
