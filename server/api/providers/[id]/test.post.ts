import { and, eq } from 'drizzle-orm'
import { generateText } from 'ai'
import { getDb, schema } from '~~/server/db'
import { decryptProviderConfig } from '~~/server/utils/provider-config'
import { createAIModel } from '~~/server/ai/provider-factory'

export default defineEventHandler(async (event) => {
  const userId = event.context.user.id
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, message: 'Provider ID is required' })

  const db = getDb()

  const [row] = await db.select()
    .from(schema.providers)
    .innerJoin(schema.providerTypes, eq(schema.providers.typeId, schema.providerTypes.id))
    .where(and(eq(schema.providers.id, id), eq(schema.providers.userId, userId)))
    .limit(1)

  if (!row)
    throw createError({ statusCode: 404, message: 'Provider not found' })

  const config = decryptProviderConfig(row.providers.configJson)

  // Check if provider has any models configured
  const providerModels = await db.select()
    .from(schema.models)
    .where(eq(schema.models.providerId, id))
    .limit(1)

  if (!providerModels.length)
    throw createError({ statusCode: 400, message: 'Add at least one model to test the connection' })

  try {
    const model = await createAIModel(
      row.provider_types.id,
      row.provider_types.aiSdkPackage,
      config,
      providerModels[0].modelId
    )

    await generateText({
      model,
      prompt: 'Say "ok"',
      maxTokens: 5
    })

    return { data: { success: true } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection failed'
    throw createError({ statusCode: 502, message: `Provider test failed: ${message}` })
  }
})
