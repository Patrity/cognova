import { reimportAgent } from '~~/server/agents/installer'
import { invalidateAgentCache } from '~~/server/agents/loader'
import { getKnowledgeLoader } from '~~/server/knowledge'

export default defineEventHandler(async (event) => {
  const agentId = getRouterParam(event, 'id')
  if (!agentId)
    throw createError({ statusCode: 400, message: 'Agent ID is required' })

  await reimportAgent(agentId)

  // Invalidate caches so next chat loads fresh agent + knowledge
  invalidateAgentCache(agentId)
  getKnowledgeLoader().invalidate(agentId)

  return { data: { success: true } }
})
