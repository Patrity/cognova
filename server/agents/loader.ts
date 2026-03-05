import { eq, and } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { getKnowledgeLoader } from '~~/server/knowledge'
import type { CognovaAgent } from '~~/shared/types/agent'
import { resolveModelForAgent } from './resolve-model'

const CACHE_TTL_MS = 5 * 60 * 1000

interface CacheEntry {
  agent: CognovaAgent
  loadedAt: number
}

const cache = new Map<string, CacheEntry>()

function cacheKey(agentId: string, userId: string): string {
  return `${agentId}:${userId}`
}

export async function loadAgent(
  agentId: string | null,
  userId: string
): Promise<CognovaAgent> {
  const db = getDb()

  // If no agentId, find the default built-in agent
  let resolvedAgentId = agentId
  if (!resolvedAgentId) {
    const [defaultAgent] = await db.select()
      .from(schema.installedAgents)
      .where(and(
        eq(schema.installedAgents.builtIn, true),
        eq(schema.installedAgents.enabled, true)
      ))
      .limit(1)

    if (!defaultAgent)
      throw createError({ statusCode: 500, message: 'No default agent configured' })

    resolvedAgentId = defaultAgent.id
  }

  // Check cache
  const key = cacheKey(resolvedAgentId, userId)
  const cached = cache.get(key)
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS)
    return cached.agent

  // Load agent record
  const [agentRecord] = await db.select()
    .from(schema.installedAgents)
    .where(eq(schema.installedAgents.id, resolvedAgentId))
    .limit(1)

  if (!agentRecord)
    throw createError({ statusCode: 404, message: 'Agent not found' })

  if (!agentRecord.enabled)
    throw createError({ statusCode: 400, message: 'Agent is disabled' })

  // Load user-specific config
  const [configRecord] = await db.select()
    .from(schema.agentConfigs)
    .where(and(
      eq(schema.agentConfigs.agentId, resolvedAgentId),
      eq(schema.agentConfigs.userId, userId)
    ))
    .limit(1)

  const agentConfig = (configRecord?.configJson ?? {}) as Record<string, unknown>

  // Load knowledge
  const knowledge = await getKnowledgeLoader().load(resolvedAgentId)

  // Build context
  const context = {
    getConfig: async () => agentConfig,
    knowledge,
    getModel: () => resolveModelForAgent(resolvedAgentId, userId),
    userId
  }

  // Load the agent's createAgent function
  let cognovaAgent: CognovaAgent

  if (agentRecord.builtIn) {
    const { createAgent } = await import('~~/server/agents/built-in/default/index')
    cognovaAgent = await createAgent(agentConfig, context)
  } else {
    // External agents (Phase 4)
    throw createError({ statusCode: 501, message: 'External agent loading not yet implemented' })
  }

  // Cache
  cache.set(key, { agent: cognovaAgent, loadedAt: Date.now() })
  return cognovaAgent
}

export function invalidateAgentCache(agentId?: string): void {
  if (agentId) {
    for (const key of cache.keys()) {
      if (key.startsWith(`${agentId}:`))
        cache.delete(key)
    }
  } else {
    cache.clear()
  }
}
