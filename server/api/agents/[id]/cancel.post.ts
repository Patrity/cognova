import { agentRegistry } from '~~/server/utils/agent-registry'
import { requireDb } from '~~/server/utils/db-guard'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Agent ID is required' })
  }

  // Cancel all running executions for this agent
  const cancelledCount = agentRegistry.cancelByAgentId(id)

  if (cancelledCount === 0) {
    throw createError({
      statusCode: 404,
      message: 'No running executions found for this agent'
    })
  }

  return {
    success: true,
    message: `Cancelled ${cancelledCount} running execution(s)`,
    cancelledCount
  }
})
