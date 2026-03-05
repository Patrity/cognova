import type { LanguageModel } from 'ai'
import { and, eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { decryptProviderConfig } from '~~/server/utils/provider-config'
import { createAIModel } from '~~/server/ai/provider-factory'

interface GetModelByIdOptions {
  modelId: string
  userId: string
}

interface GetModelByTagsOptions {
  tags: string[]
  userId: string
}

type GetModelOptions = GetModelByIdOptions | GetModelByTagsOptions

function hasModelId(opts: GetModelOptions): opts is GetModelByIdOptions {
  return 'modelId' in opts
}

export async function getModel(options: GetModelOptions): Promise<LanguageModel> {
  const db = getDb()

  let modelRecord: {
    models: typeof schema.models.$inferSelect
    providers: typeof schema.providers.$inferSelect
    provider_types: typeof schema.providerTypes.$inferSelect
  } | undefined

  if (hasModelId(options)) {
    const rows = await db.select()
      .from(schema.models)
      .innerJoin(schema.providers, eq(schema.models.providerId, schema.providers.id))
      .innerJoin(schema.providerTypes, eq(schema.providers.typeId, schema.providerTypes.id))
      .where(and(
        eq(schema.models.id, options.modelId),
        eq(schema.providers.userId, options.userId)
      ))
      .limit(1)
    modelRecord = rows[0]
  } else {
    const allModels = await db.select()
      .from(schema.models)
      .innerJoin(schema.providers, eq(schema.models.providerId, schema.providers.id))
      .innerJoin(schema.providerTypes, eq(schema.providers.typeId, schema.providerTypes.id))
      .where(eq(schema.providers.userId, options.userId))

    // Try exact match (all tags present)
    modelRecord = allModels.find(m =>
      options.tags.every(tag => (m.models.tags || []).includes(tag))
    )

    // Fallback to partial match
    if (!modelRecord) {
      modelRecord = allModels.find(m =>
        options.tags.some(tag => (m.models.tags || []).includes(tag))
      )
      if (modelRecord)
        console.warn(`[ai] No model matched all tags [${options.tags}], fell back to partial match: ${modelRecord.models.modelId}`)
    }
  }

  if (!modelRecord)
    throw createError({ statusCode: 404, message: 'No model found matching criteria' })

  const config = decryptProviderConfig(modelRecord.providers.configJson)

  return createAIModel(
    modelRecord.provider_types.id,
    modelRecord.provider_types.aiSdkPackage,
    config,
    modelRecord.models.modelId
  )
}
