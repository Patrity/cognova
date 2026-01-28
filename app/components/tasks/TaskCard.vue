<script setup lang="ts">
import type { Task } from '~~/shared/types'

const props = defineProps<{
  task: Task
}>()

const emit = defineEmits<{
  toggle: [id: string]
  edit: [task: Task]
  delete: [id: string]
  view: [task: Task]
}>()

const priorityConfig = {
  1: { label: 'Low', color: 'neutral' as const, icon: 'i-lucide-arrow-down' },
  2: { label: 'Medium', color: 'warning' as const, icon: 'i-lucide-minus' },
  3: { label: 'High', color: 'error' as const, icon: 'i-lucide-arrow-up' }
}

const statusConfig = {
  todo: { label: 'Todo', color: 'neutral' as const, icon: 'i-lucide-circle' },
  in_progress: { label: 'In Progress', color: 'info' as const, icon: 'i-lucide-clock' },
  done: { label: 'Done', color: 'success' as const, icon: 'i-lucide-check-circle' },
  blocked: { label: 'Blocked', color: 'error' as const, icon: 'i-lucide-alert-circle' }
}

const priority = computed(() => priorityConfig[props.task.priority as 1 | 2 | 3] || priorityConfig[2])
const status = computed(() => statusConfig[props.task.status])
const isDone = computed(() => props.task.status === 'done')
const hasDescription = computed(() => !!props.task.description?.trim())

const isOverdue = computed(() => {
  if (!props.task.dueDate || isDone.value) return false
  return new Date(props.task.dueDate) < new Date()
})

function formatDate(date: Date | string | undefined) {
  if (!date) return null
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const menuItems = computed(() => [[
  {
    label: 'Edit',
    icon: 'i-lucide-pencil',
    onSelect: () => emit('edit', props.task)
  },
  {
    label: 'Delete',
    icon: 'i-lucide-trash-2',
    color: 'error' as const,
    onSelect: () => emit('delete', props.task.id)
  }
]])
</script>

<template>
  <div
    class="group flex items-start gap-3 p-3 rounded-lg border border-default hover:bg-elevated transition-colors"
    :class="{ 'opacity-60': isDone }"
  >
    <!-- Checkbox -->
    <button
      class="mt-0.5 shrink-0"
      @click.stop="emit('toggle', task.id)"
    >
      <UIcon
        :name="isDone ? 'i-lucide-check-circle-2' : 'i-lucide-circle'"
        class="size-5"
        :class="isDone ? 'text-success' : 'text-dimmed hover:text-default'"
      />
    </button>

    <!-- Content (clickable for details) -->
    <button
      class="flex-1 min-w-0 text-left"
      @click="emit('view', task)"
    >
      <div class="flex items-center gap-2">
        <span
          class="font-medium"
          :class="{ 'line-through text-dimmed': isDone }"
        >
          {{ task.title }}
        </span>
        <UIcon
          v-if="hasDescription"
          name="i-lucide-file-text"
          class="size-3.5 text-dimmed shrink-0"
        />
      </div>

      <!-- Meta row -->
      <div class="flex items-center flex-wrap gap-2 mt-2">
        <!-- Project badge -->
        <UBadge
          v-if="task.project"
          variant="subtle"
          color="neutral"
          size="xs"
        >
          <span
            class="size-2 rounded-full mr-1"
            :style="{ backgroundColor: task.project.color }"
          />
          {{ task.project.name }}
        </UBadge>

        <!-- Priority badge -->
        <UBadge
          v-if="task.priority !== 2"
          :color="priority.color"
          variant="subtle"
          size="xs"
        >
          <UIcon
            :name="priority.icon"
            class="size-3 mr-1"
          />
          {{ priority.label }}
        </UBadge>

        <!-- Status badge (if not todo or done) -->
        <UBadge
          v-if="task.status === 'in_progress' || task.status === 'blocked'"
          :color="status.color"
          variant="subtle"
          size="xs"
        >
          <UIcon
            :name="status.icon"
            class="size-3 mr-1"
          />
          {{ status.label }}
        </UBadge>

        <!-- Due date -->
        <span
          v-if="task.dueDate"
          class="text-xs flex items-center gap-1"
          :class="isOverdue ? 'text-error' : 'text-dimmed'"
        >
          <UIcon
            name="i-lucide-calendar"
            class="size-3"
          />
          {{ formatDate(task.dueDate) }}
        </span>

        <!-- Tags -->
        <UBadge
          v-for="tag in task.tags?.slice(0, 3)"
          :key="tag"
          variant="subtle"
          color="neutral"
          size="xs"
        >
          {{ tag }}
        </UBadge>
        <span
          v-if="task.tags && task.tags.length > 3"
          class="text-xs text-dimmed"
        >
          +{{ task.tags.length - 3 }}
        </span>
      </div>
    </button>

    <!-- Actions -->
    <UDropdownMenu :items="menuItems">
      <UButton
        icon="i-lucide-more-vertical"
        color="neutral"
        variant="ghost"
        size="xs"
        class="opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </UDropdownMenu>
  </div>
</template>
