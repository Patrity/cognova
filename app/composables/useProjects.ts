import type { Project, CreateProjectInput, UpdateProjectInput } from '~~/shared/types'

export function useProjects() {
  const projects = ref<Project[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchProjects(includeDeleted = false) {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch<{ data: Project[] }>('/api/projects', {
        query: { includeDeleted: includeDeleted.toString() }
      })
      projects.value = response.data
      return response.data
    } catch (e) {
      error.value = 'Failed to load projects'
      console.error('Failed to load projects:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getProject(id: string) {
    try {
      const response = await $fetch<{ data: Project }>(`/api/projects/${id}`)
      return response.data
    } catch (e) {
      console.error('Failed to get project:', e)
      throw e
    }
  }

  async function createProject(input: CreateProjectInput) {
    try {
      const response = await $fetch<{ data: Project }>('/api/projects', {
        method: 'POST',
        body: input
      })
      projects.value = [...projects.value, response.data]
      return response.data
    } catch (e) {
      console.error('Failed to create project:', e)
      throw e
    }
  }

  async function updateProject(id: string, input: UpdateProjectInput) {
    try {
      const response = await $fetch<{ data: Project }>(`/api/projects/${id}`, {
        method: 'PUT',
        body: input
      })
      const index = projects.value.findIndex(p => p.id === id)
      if (index !== -1)
        projects.value[index] = response.data
      return response.data
    } catch (e) {
      console.error('Failed to update project:', e)
      throw e
    }
  }

  async function deleteProject(id: string) {
    try {
      const response = await $fetch<{ data: Project }>(`/api/projects/${id}`, {
        method: 'DELETE'
      })
      projects.value = projects.value.filter(p => p.id !== id)
      return response.data
    } catch (e) {
      console.error('Failed to delete project:', e)
      throw e
    }
  }

  // Get project by ID from local state
  function getProjectById(id: string | undefined | null): Project | undefined {
    if (!id) return undefined
    return projects.value.find(p => p.id === id)
  }

  return {
    projects,
    loading,
    error,
    fetchProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    getProjectById
  }
}
