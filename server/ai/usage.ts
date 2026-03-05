import { getDb, schema } from '~~/server/db'
import { estimateCost } from '~~/server/ai/cost'

interface LogUsageInput {
  userId: string
  providerId?: string
  modelId: string
  source: 'chat' | 'agent' | 'memory' | 'cron'
  inputTokens: number
  outputTokens: number
}

export async function logTokenUsage(input: LogUsageInput): Promise<void> {
  try {
    const cost = estimateCost(input.modelId, input.inputTokens, input.outputTokens)
    const db = getDb()
    await db.insert(schema.tokenUsage).values({
      userId: input.userId,
      providerId: input.providerId || null,
      modelId: input.modelId,
      source: input.source,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      cost
    })
  } catch (error) {
    console.error('[usage] Failed to log token usage:', error)
  }
}
