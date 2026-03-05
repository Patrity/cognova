import { eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { decryptProviderConfig, maskSensitiveFields } from '~~/server/utils/provider-config'

export default defineEventHandler(async (event) => {
  const userId = event.context.user.id
  const db = getDb()

  const rows = await db.select()
    .from(schema.providers)
    .innerJoin(schema.providerTypes, eq(schema.providers.typeId, schema.providerTypes.id))
    .where(eq(schema.providers.userId, userId))
    .orderBy(schema.providers.createdAt)

  const result = rows.map((row) => {
    const config = decryptProviderConfig(row.providers.configJson)
    const masked = maskSensitiveFields(config, row.provider_types.configSchema)
    return {
      ...row.providers,
      configJson: masked,
      type: row.provider_types
    }
  })

  return { data: result }
})
