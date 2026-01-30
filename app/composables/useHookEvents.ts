import type { HookEvent, HookEventStats, HookEventFilters, StatsPeriod } from '~~/shared/types'

export function useHookEvents() {
  const events = ref<HookEvent[]>([])
  const stats = ref<HookEventStats | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchEvents(filters?: HookEventFilters) {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch<{ data: HookEvent[] }>('/api/hooks/events', {
        query: filters
      })
      events.value = response.data
      return response.data
    } catch (e) {
      error.value = 'Failed to load hook events'
      console.error('Failed to load hook events:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchStats(period: StatsPeriod = '7d') {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch<{ data: HookEventStats }>('/api/hooks/stats', {
        query: { period }
      })
      stats.value = response.data
      return response.data
    } catch (e) {
      error.value = 'Failed to load hook stats'
      console.error('Failed to load hook stats:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchEventsBySession(sessionId: string, limit = 100) {
    try {
      const response = await $fetch<{ data: HookEvent[] }>('/api/hooks/events', {
        query: { sessionId, limit }
      })
      return response.data
    } catch (e) {
      console.error('Failed to fetch session events:', e)
      throw e
    }
  }

  return {
    events,
    stats,
    loading,
    error,
    fetchEvents,
    fetchStats,
    fetchEventsBySession
  }
}
