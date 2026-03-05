import type { ProviderType, ProviderWithType } from '~~/shared/types'

const providers = ref<ProviderWithType[]>([])
const providerTypes = ref<ProviderType[]>([])
const loading = ref(false)

export function useProviders() {
  async function fetchProviders() {
    loading.value = true
    try {
      const { data } = await $fetch<{ data: ProviderWithType[] }>('/api/providers')
      providers.value = data
    } finally {
      loading.value = false
    }
  }

  async function fetchProviderTypes() {
    const { data } = await $fetch<{ data: ProviderType[] }>('/api/provider-types')
    providerTypes.value = data
  }

  async function createProvider(input: { name: string, typeId: string, configJson: Record<string, unknown> }) {
    const { data } = await $fetch<{ data: ProviderWithType }>('/api/providers', {
      method: 'POST',
      body: input
    })
    await fetchProviders()
    return data
  }

  async function updateProvider(id: string, input: { name?: string, configJson?: Record<string, unknown> }) {
    const { data } = await $fetch<{ data: ProviderWithType }>(`/api/providers/${id}`, {
      method: 'PUT',
      body: input
    })
    await fetchProviders()
    return data
  }

  async function deleteProvider(id: string) {
    await $fetch(`/api/providers/${id}`, { method: 'DELETE' })
    providers.value = providers.value.filter(p => p.id !== id)
  }

  async function testProvider(id: string) {
    const { data } = await $fetch<{ data: { success: boolean } }>(`/api/providers/${id}/test`, {
      method: 'POST'
    })
    return data
  }

  return {
    providers,
    providerTypes,
    loading,
    fetchProviders,
    fetchProviderTypes,
    createProvider,
    updateProvider,
    deleteProvider,
    testProvider
  }
}
