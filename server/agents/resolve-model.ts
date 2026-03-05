import type { LanguageModel } from 'ai'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { getModel } from '~~/server/ai/get-model'
import type { AgentManifest } from '~~/shared/types/agent'

export async function resolveModelForAgent(
  agentId: string | null,
  userId: string
): Promise<LanguageModel> {
  const db = getDb()

  // If agent specifies an explicit modelId, use it (highest priority)
  if (agentId) {
    const [agent] = await db.select()
      .from(schema.installedAgents)
      .where(eq(schema.installedAgents.id, agentId))
      .limit(1)

    if (agent) {
      const manifest = agent.manifestJson as AgentManifest
      if (manifest.model?.modelId)
        return getModel({ modelId: manifest.model.modelId, userId })
    }
  }

  // User's default model setting takes priority over agent tags
  const [setting] = await db.select()
    .from(schema.appSettings)
    .where(eq(schema.appSettings.key, 'defaultModelId'))
    .limit(1)

  if (setting?.value)
    return getModel({ modelId: setting.value as string, userId })

  // Fall back to agent manifest tags
  if (agentId) {
    const [agent] = await db.select()
      .from(schema.installedAgents)
      .where(eq(schema.installedAgents.id, agentId))
      .limit(1)

    if (agent) {
      const manifest = agent.manifestJson as AgentManifest
      if (manifest.model?.tags?.length)
        return getModel({ tags: manifest.model.tags, userId })
    }
  }

  // Last resort: try any model tagged 'frontier'
  return getModel({ tags: ['frontier'], userId })
}
