<script setup lang="ts">
import type { CommandPaletteGroup, CommandPaletteItem } from '@nuxt/ui'
import { formatRelativeTime } from '~~/shared/utils/formatting'

const router = useRouter()
const toast = useToast()
const { searchTerm, loading, results, reset } = useSearch()

const statusIcons: Record<string, string> = {
  todo: 'i-lucide-circle',
  in_progress: 'i-lucide-clock',
  done: 'i-lucide-check-circle',
  blocked: 'i-lucide-alert-circle'
}

const priorityLabels: Record<number, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High'
}

const navigationItems: CommandPaletteItem[] = [
  { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/dashboard', kbds: ['G', 'D'] },
  { label: 'Tasks', icon: 'i-lucide-check-square', to: '/tasks', kbds: ['G', 'T'] },
  { label: 'Docs', icon: 'i-lucide-file-text', to: '/docs', kbds: ['G', 'O'] },
  { label: 'Settings', icon: 'i-lucide-settings', to: '/settings', kbds: ['G', 'S'] }
]

const actionItems: CommandPaletteItem[] = [
  {
    label: 'Create new document',
    icon: 'i-lucide-file-plus',
    onSelect: () => {
      router.push('/docs')
      toast.add({
        title: 'Create a document',
        description: 'Right-click in the file tree to create a new file',
        icon: 'i-lucide-info'
      })
      reset()
    }
  },
  {
    label: 'Add new task',
    icon: 'i-lucide-plus-square',
    onSelect: () => {
      router.push('/tasks?action=new')
      reset()
    }
  }
]

const groups = computed<CommandPaletteGroup[]>(() => {
  const g: CommandPaletteGroup[] = []

  // Tasks group (only show if we have results)
  if (results.value.tasks.length) {
    g.push({
      id: 'tasks',
      label: 'Tasks',
      ignoreFilter: true,
      items: results.value.tasks.map(t => ({
        label: t.title,
        icon: statusIcons[t.status] || 'i-lucide-circle',
        suffix: t.project?.name || priorityLabels[t.priority] || '',
        onSelect: () => {
          router.push(`/tasks?selected=${t.id}`)
          reset()
        }
      }))
    })
  }

  // Documents group (only show if we have results)
  if (results.value.documents.length) {
    g.push({
      id: 'documents',
      label: 'Documents',
      ignoreFilter: true,
      items: results.value.documents.map(d => ({
        label: d.title,
        icon: 'i-lucide-file-text',
        suffix: d.path,
        onSelect: () => {
          router.push(`/docs?path=${encodeURIComponent(d.path)}`)
          reset()
        }
      }))
    })
  }

  // Agents group (only show if we have results)
  if (results.value.agents.length) {
    g.push({
      id: 'agents',
      label: 'Agents',
      ignoreFilter: true,
      items: results.value.agents.map(a => ({
        label: a.name,
        icon: a.enabled ? 'i-lucide-bot' : 'i-lucide-bot-off',
        suffix: a.schedule,
        onSelect: () => {
          router.push(`/agents/${a.id}`)
          reset()
        }
      }))
    })
  }

  // Conversations group (only show if we have results)
  if (results.value.conversations.length) {
    g.push({
      id: 'conversations',
      label: 'Conversations',
      ignoreFilter: true,
      items: results.value.conversations.map(c => ({
        label: c.title || 'Untitled chat',
        icon: 'i-lucide-message-square',
        suffix: formatRelativeTime(c.startedAt),
        onSelect: () => {
          router.push({ path: '/chat', query: { conversation: c.id } })
          reset()
        }
      }))
    })
  }

  // Navigation group (always visible)
  g.push({
    id: 'navigation',
    label: 'Navigation',
    items: navigationItems
  })

  // Actions group (filtered based on search term)
  g.push({
    id: 'actions',
    label: 'Actions',
    items: actionItems,
    postFilter: (term: string, items: CommandPaletteItem[]) => {
      if (!term) return items
      const lower = term.toLowerCase()
      return ['new', 'create', 'add'].some(k => lower.includes(k)) ? items : []
    }
  })

  return g
})
</script>

<template>
  <UDashboardSearch
    v-model:search-term="searchTerm"
    :groups="groups"
    :loading="loading"
    placeholder="Search tasks, docs, agents, chats..."
    :fuse="{ resultLimit: 10 }"
  />
</template>
