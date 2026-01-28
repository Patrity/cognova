import type { Task, CreateTaskInput, UpdateTaskInput, TaskFilters, TaskStatus } from '~~/shared/types'

export function useTasks() {
  const tasks = ref<Task[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const tags = ref<string[]>([])

  // Filter state
  const filters = reactive<TaskFilters>({
    status: undefined,
    projectId: undefined,
    search: undefined,
    includeDeleted: false
  })

  async function fetchTasks(customFilters?: TaskFilters) {
    loading.value = true
    error.value = null

    const queryFilters = customFilters || filters

    try {
      const query: Record<string, string> = {}

      if (queryFilters.status) {
        if (Array.isArray(queryFilters.status))
          queryFilters.status.forEach(s => query.status = s)
        else
          query.status = queryFilters.status
      }
      if (queryFilters.projectId)
        query.projectId = queryFilters.projectId
      if (queryFilters.search)
        query.search = queryFilters.search
      if (queryFilters.includeDeleted)
        query.includeDeleted = 'true'

      const response = await $fetch<{ data: Task[] }>('/api/tasks', { query })
      tasks.value = response.data
      return response.data
    } catch (e) {
      error.value = 'Failed to load tasks'
      console.error('Failed to load tasks:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchTags() {
    try {
      const response = await $fetch<{ data: string[] }>('/api/tasks/tags')
      tags.value = response.data
      return response.data
    } catch (e) {
      console.error('Failed to fetch tags:', e)
      throw e
    }
  }

  async function getTask(id: string) {
    try {
      const response = await $fetch<{ data: Task }>(`/api/tasks/${id}`)
      return response.data
    } catch (e) {
      console.error('Failed to get task:', e)
      throw e
    }
  }

  async function createTask(input: CreateTaskInput) {
    try {
      const response = await $fetch<{ data: Task }>('/api/tasks', {
        method: 'POST',
        body: input
      })
      tasks.value = [response.data, ...tasks.value]
      return response.data
    } catch (e) {
      console.error('Failed to create task:', e)
      throw e
    }
  }

  async function updateTask(id: string, input: UpdateTaskInput) {
    try {
      const response = await $fetch<{ data: Task }>(`/api/tasks/${id}`, {
        method: 'PUT',
        body: input
      })
      const index = tasks.value.findIndex(t => t.id === id)
      if (index !== -1)
        tasks.value[index] = response.data
      return response.data
    } catch (e) {
      console.error('Failed to update task:', e)
      throw e
    }
  }

  async function deleteTask(id: string) {
    try {
      const response = await $fetch<{ data: Task }>(`/api/tasks/${id}`, {
        method: 'DELETE'
      })
      tasks.value = tasks.value.filter(t => t.id !== id)
      return response.data
    } catch (e) {
      console.error('Failed to delete task:', e)
      throw e
    }
  }

  async function restoreTask(id: string) {
    try {
      const response = await $fetch<{ data: Task }>(`/api/tasks/${id}/restore`, {
        method: 'POST'
      })
      // Re-fetch to update the list properly
      await fetchTasks()
      return response.data
    } catch (e) {
      console.error('Failed to restore task:', e)
      throw e
    }
  }

  // Quick status toggle (for checkbox)
  async function toggleComplete(id: string) {
    const task = tasks.value.find(t => t.id === id)
    if (!task) return

    const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done'
    return updateTask(id, { status: newStatus })
  }

  // Computed filtered tasks (client-side filtering for instant feedback)
  const filteredTasks = computed(() => {
    let result = [...tasks.value]

    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
      result = result.filter(t => statuses.includes(t.status))
    }

    if (filters.projectId)
      result = result.filter(t => t.projectId === filters.projectId)

    if (filters.search) {
      const search = filters.search.toLowerCase()
      result = result.filter(t =>
        t.title.toLowerCase().includes(search)
        || t.description?.toLowerCase().includes(search)
      )
    }

    if (!filters.includeDeleted)
      result = result.filter(t => !t.deletedAt)

    return result
  })

  // Task counts by status
  const taskCounts = computed(() => {
    const counts = {
      todo: 0,
      in_progress: 0,
      done: 0,
      blocked: 0,
      total: 0
    }

    tasks.value.forEach((task) => {
      if (!task.deletedAt) {
        counts[task.status]++
        counts.total++
      }
    })

    return counts
  })

  return {
    tasks,
    filteredTasks,
    loading,
    error,
    tags,
    filters,
    taskCounts,
    fetchTasks,
    fetchTags,
    getTask,
    createTask,
    updateTask,
    deleteTask,
    restoreTask,
    toggleComplete
  }
}
