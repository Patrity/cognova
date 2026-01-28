import { refDebounced } from '@vueuse/core'
import type { Task, Document } from '~~/shared/types'

export interface SearchResults {
  tasks: Task[]
  documents: Document[]
}

export function useSearch() {
  const searchTerm = ref('')
  const debouncedSearchTerm = refDebounced(searchTerm, 300)
  const loading = ref(false)
  const results = ref<SearchResults>({
    tasks: [],
    documents: []
  })

  watch(debouncedSearchTerm, async (term) => {
    if (!term || term.length < 2) {
      results.value = { tasks: [], documents: [] }
      return
    }

    loading.value = true
    try {
      const [tasksRes, docsRes] = await Promise.all([
        $fetch<{ data: Task[] }>('/api/tasks', { query: { search: term } }),
        $fetch<{ data: Document[] }>('/api/documents', { query: { search: term } })
      ])
      results.value = {
        tasks: tasksRes.data.slice(0, 5),
        documents: docsRes.data.slice(0, 5)
      }
    } catch {
      results.value = { tasks: [], documents: [] }
    } finally {
      loading.value = false
    }
  })

  function reset() {
    searchTerm.value = ''
    results.value = { tasks: [], documents: [] }
  }

  return {
    searchTerm,
    loading,
    results,
    reset
  }
}
