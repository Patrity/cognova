<script setup lang="ts">
import type { DashboardOverview } from '~~/shared/types'

defineProps<{
  tasks: DashboardOverview['tasks']['upcoming']
  loading?: boolean
}>()

const priorityLabels = { 1: 'Low', 2: 'Med', 3: 'High' } as const
const priorityColors = { 1: 'neutral', 2: 'warning', 3: 'error' } as const
const statusColors = { todo: 'neutral', in_progress: 'primary', blocked: 'error' } as const

function formatDueDate(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `${days}d`
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-check-square"
            class="size-4 text-primary"
          />
          <span class="text-sm font-medium">Upcoming Tasks</span>
        </div>
        <UButton
          to="/tasks"
          variant="ghost"
          size="xs"
          trailing-icon="i-lucide-arrow-right"
        >
          View all
        </UButton>
      </div>
    </template>

    <div
      v-if="loading"
      class="space-y-3"
    >
      <div
        v-for="i in 3"
        :key="i"
        class="flex items-center gap-3"
      >
        <USkeleton class="h-5 w-5 rounded" />
        <USkeleton class="h-4 flex-1" />
      </div>
    </div>

    <div
      v-else-if="tasks.length === 0"
      class="text-center py-4 text-muted text-sm"
    >
      No upcoming tasks
    </div>

    <div
      v-else
      class="space-y-2"
    >
      <NuxtLink
        v-for="task in tasks"
        :key="task.id"
        :to="{ path: '/tasks', query: { selected: task.id } }"
        class="flex items-center gap-3 p-2 -mx-2 rounded-md hover:bg-elevated transition-colors"
      >
        <UBadge
          :color="statusColors[task.status as keyof typeof statusColors] || 'neutral'"
          variant="subtle"
          size="xs"
        >
          {{ task.status === 'in_progress' ? 'WIP' : task.status }}
        </UBadge>

        <span class="text-sm truncate flex-1">{{ task.title }}</span>

        <UBadge
          v-if="task.projectName"
          variant="subtle"
          color="neutral"
          size="xs"
        >
          <span
            class="inline-block size-2 rounded-full mr-1"
            :style="{ background: task.projectColor || 'var(--ui-primary)' }"
          />
          {{ task.projectName }}
        </UBadge>

        <UBadge
          :color="priorityColors[task.priority as keyof typeof priorityColors] || 'neutral'"
          variant="soft"
          size="xs"
        >
          {{ priorityLabels[task.priority as keyof typeof priorityLabels] || 'Med' }}
        </UBadge>

        <span
          v-if="task.dueDate"
          class="text-xs text-muted whitespace-nowrap"
        >
          {{ formatDueDate(task.dueDate) }}
        </span>
      </NuxtLink>
    </div>
  </UCard>
</template>
