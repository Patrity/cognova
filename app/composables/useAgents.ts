import type { InstalledAgent } from '~~/shared/types'

const agents = ref<InstalledAgent[]>([])
const loading = ref(false)

export function useAgents() {
  async function fetchAgents(all = false) {
    loading.value = true
    try {
      const query = all ? '?all=true' : ''
      const { data } = await $fetch<{ data: InstalledAgent[] }>(`/api/agents${query}`)
      agents.value = data
    } finally {
      loading.value = false
    }
  }

  async function installAgent(localPath: string) {
    const { data } = await $fetch<{ data: { id: string } }>('/api/agents/install', {
      method: 'POST',
      body: { localPath }
    })
    await fetchAgents(true)
    return data.id
  }

  async function toggleAgent(id: string, enabled: boolean) {
    await $fetch(`/api/agents/${id}`, {
      method: 'PUT',
      body: { enabled }
    })
    await fetchAgents(true)
  }

  async function uninstallAgent(id: string) {
    await $fetch(`/api/agents/${id}`, { method: 'DELETE' })
    agents.value = agents.value.filter(a => a.id !== id)
  }

  async function reimportAgent(id: string) {
    await $fetch(`/api/agents/${id}/reimport`, { method: 'POST' })
    await fetchAgents(true)
  }

  async function getConfig(agentId: string) {
    const { data } = await $fetch<{ data: Record<string, unknown> }>(`/api/agents/${agentId}/config`)
    return data
  }

  async function saveConfig(agentId: string, configJson: Record<string, unknown>) {
    await $fetch(`/api/agents/${agentId}/config`, {
      method: 'PUT',
      body: { configJson }
    })
  }

  return {
    agents,
    loading,
    fetchAgents,
    installAgent,
    toggleAgent,
    uninstallAgent,
    reimportAgent,
    getConfig,
    saveConfig
  }
}
