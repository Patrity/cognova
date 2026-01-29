import type { CronAgent, CronAgentRun, CreateAgentInput, UpdateAgentInput } from '~~/shared/types'

export function useAgents() {
  const agents = ref<CronAgent[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAgents() {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch<{ data: CronAgent[] }>('/api/agents')
      agents.value = response.data
      return response.data
    } catch (e) {
      error.value = 'Failed to load agents'
      console.error('Failed to load agents:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createAgent(input: CreateAgentInput) {
    try {
      const response = await $fetch<{ data: CronAgent }>('/api/agents', {
        method: 'POST',
        body: input
      })
      agents.value = [response.data, ...agents.value]
      return response.data
    } catch (e) {
      console.error('Failed to create agent:', e)
      throw e
    }
  }

  async function updateAgent(id: string, input: UpdateAgentInput) {
    try {
      const response = await $fetch<{ data: CronAgent }>(`/api/agents/${id}`, {
        method: 'PATCH',
        body: input
      })
      const index = agents.value.findIndex(a => a.id === id)
      if (index !== -1)
        agents.value[index] = response.data
      return response.data
    } catch (e) {
      console.error('Failed to update agent:', e)
      throw e
    }
  }

  async function deleteAgent(id: string) {
    try {
      await $fetch(`/api/agents/${id}`, { method: 'DELETE' })
      agents.value = agents.value.filter(a => a.id !== id)
    } catch (e) {
      console.error('Failed to delete agent:', e)
      throw e
    }
  }

  async function toggleEnabled(id: string) {
    const agent = agents.value.find(a => a.id === id)
    if (!agent) return

    return updateAgent(id, { enabled: !agent.enabled })
  }

  async function runAgent(id: string) {
    try {
      await $fetch(`/api/agents/${id}/run`, { method: 'POST' })
    } catch (e) {
      console.error('Failed to run agent:', e)
      throw e
    }
  }

  async function fetchRuns(agentId: string, limit = 20) {
    try {
      const response = await $fetch<{ data: CronAgentRun[] }>(`/api/agents/${agentId}/runs`, {
        query: { limit }
      })
      return response.data
    } catch (e) {
      console.error('Failed to fetch runs:', e)
      throw e
    }
  }

  return {
    agents,
    loading,
    error,
    fetchAgents,
    createAgent,
    updateAgent,
    deleteAgent,
    toggleEnabled,
    runAgent,
    fetchRuns
  }
}
