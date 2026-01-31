import type { MemoryChunk, MemoryChunkType } from '~~/shared/types'

interface MemoryFilters {
  query?: string
  chunkType?: MemoryChunkType | 'all'
  projectPath?: string
  limit?: number
}

export function useMemories() {
  const memories = ref<MemoryChunk[]>([])
  const loading = ref(true) // Start true to avoid SSR rendering issues
  const error = ref<string | null>(null)

  const filters = reactive<MemoryFilters>({
    query: '',
    chunkType: 'all',
    limit: 50
  })

  async function fetchMemories(customFilters?: Partial<MemoryFilters>) {
    loading.value = true
    error.value = null

    const queryFilters = { ...filters, ...customFilters }

    try {
      const query: Record<string, string> = {}

      if (queryFilters.query)
        query.query = queryFilters.query
      if (queryFilters.chunkType && queryFilters.chunkType !== 'all')
        query.chunkType = queryFilters.chunkType
      if (queryFilters.projectPath)
        query.projectPath = queryFilters.projectPath
      if (queryFilters.limit)
        query.limit = String(queryFilters.limit)

      const response = await $fetch<{ data: MemoryChunk[] }>('/api/memory/search', { query })
      memories.value = response.data
      return response.data
    } catch (e) {
      error.value = 'Failed to load memories'
      console.error('Failed to load memories:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteMemory(id: string) {
    try {
      await $fetch(`/api/memory/${id}`, { method: 'DELETE' })
      memories.value = memories.value.filter(m => m.id !== id)
    } catch (e) {
      console.error('Failed to delete memory:', e)
      throw e
    }
  }

  // Computed stats
  const stats = computed(() => {
    const byType = memories.value.reduce((acc, m) => {
      acc[m.chunkType] = (acc[m.chunkType] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total: memories.value.length,
      byType
    }
  })

  return {
    memories,
    loading,
    error,
    filters,
    stats,
    fetchMemories,
    deleteMemory
  }
}
