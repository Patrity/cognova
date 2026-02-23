import { refDebounced } from '@vueuse/core'
import type { Task, Document, CronAgent, Conversation } from '~~/shared/types'

export interface SearchResults {
  tasks: Task[]
  documents: Document[]
  agents: CronAgent[]
  conversations: Conversation[]
}

const emptyResults: SearchResults = {
  tasks: [],
  documents: [],
  agents: [],
  conversations: []
}

export function useSearch() {
  const searchTerm = ref('')
  const debouncedSearchTerm = refDebounced(searchTerm, 300)
  const loading = ref(false)
  const results = ref<SearchResults>({ ...emptyResults })

  watch(debouncedSearchTerm, async (term) => {
    if (!term || term.length < 2) {
      results.value = { ...emptyResults }
      return
    }

    loading.value = true
    try {
      const [tasksRes, docsRes, agentsRes, convsRes] = await Promise.all([
        $fetch<{ data: Task[] }>('/api/tasks', { query: { search: term } }),
        $fetch<{ data: Document[] }>('/api/documents', { query: { search: term } }),
        $fetch<{ data: CronAgent[] }>('/api/agents', { query: { search: term } }),
        $fetch<{ data: Conversation[] }>('/api/conversations', { query: { search: term } })
      ])
      results.value = {
        tasks: tasksRes.data.slice(0, 5),
        documents: docsRes.data.slice(0, 5),
        agents: agentsRes.data.slice(0, 5),
        conversations: convsRes.data.slice(0, 5)
      }
    } catch {
      results.value = { ...emptyResults }
    } finally {
      loading.value = false
    }
  })

  function reset() {
    searchTerm.value = ''
    results.value = { ...emptyResults }
  }

  return {
    searchTerm,
    loading,
    results,
    reset
  }
}
