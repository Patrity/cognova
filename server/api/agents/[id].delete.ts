import { uninstallAgent } from '~~/server/agents/installer'
import { invalidateAgentCache } from '~~/server/agents/loader'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id)
    throw createError({ statusCode: 400, message: 'Agent ID is required' })

  await uninstallAgent(id)
  invalidateAgentCache(id)

  return { data: { deleted: true } }
})
