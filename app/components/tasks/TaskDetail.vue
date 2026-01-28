<script setup lang="ts">
import type { Task } from '~~/shared/types'

const props = defineProps<{
  task: Task
}>()

const emit = defineEmits<{
  edit: []
  close: []
  toggle: []
}>()

const priorityConfig = {
  1: { label: 'Low', color: 'neutral' as const },
  2: { label: 'Medium', color: 'warning' as const },
  3: { label: 'High', color: 'error' as const }
}

const statusConfig = {
  todo: { label: 'Todo', color: 'neutral' as const },
  in_progress: { label: 'In Progress', color: 'info' as const },
  done: { label: 'Done', color: 'success' as const },
  blocked: { label: 'Blocked', color: 'error' as const }
}

const priority = computed(() => priorityConfig[props.task.priority as 1 | 2 | 3] || priorityConfig[2])
const status = computed(() => statusConfig[props.task.status])
const isComplete = computed(() => props.task.status === 'done')

function formatDate(date: Date | string | undefined) {
  if (!date) return null
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-start justify-between gap-4">
        <h3 class="text-lg font-semibold">
          {{ task.title }}
        </h3>
        <UBadge
          :color="status.color"
          variant="subtle"
        >
          {{ status.label }}
        </UBadge>
      </div>
    </template>

    <div class="space-y-4">
      <!-- Meta info -->
      <div class="flex flex-wrap items-center gap-3 text-sm">
        <div
          v-if="task.project"
          class="flex items-center gap-1.5"
        >
          <span
            class="size-2.5 rounded-full"
            :style="{ backgroundColor: task.project.color }"
          />
          <span class="text-dimmed">{{ task.project.name }}</span>
        </div>

        <div class="flex items-center gap-1.5">
          <UIcon
            name="i-lucide-flag"
            class="size-4 text-dimmed"
          />
          <UBadge
            :color="priority.color"
            variant="subtle"
            size="xs"
          >
            {{ priority.label }}
          </UBadge>
        </div>

        <div
          v-if="task.dueDate"
          class="flex items-center gap-1.5"
        >
          <UIcon
            name="i-lucide-calendar"
            class="size-4 text-dimmed"
          />
          <span class="text-dimmed">{{ formatDate(task.dueDate) }}</span>
        </div>
      </div>

      <!-- Tags -->
      <div
        v-if="task.tags && task.tags.length > 0"
        class="flex flex-wrap gap-1.5"
      >
        <UBadge
          v-for="tag in task.tags"
          :key="tag"
          variant="subtle"
          color="neutral"
          size="sm"
        >
          {{ tag }}
        </UBadge>
      </div>

      <!-- Description -->
      <div
        v-if="task.description"
        class="pt-2 border-t border-default"
      >
        <div class="prose prose-sm dark:prose-invert max-w-none">
          <MDC :value="task.description" />
        </div>
      </div>

      <!-- Timestamps & Audit -->
      <div class="pt-2 border-t border-default text-xs text-dimmed space-y-1">
        <p>
          Created: {{ formatDate(task.createdAt) }}
          <span v-if="task.creator"> by {{ task.creator.name }}</span>
        </p>
        <p v-if="task.completedAt">
          Completed: {{ formatDate(task.completedAt) }}
        </p>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-between">
        <UButton
          :icon="isComplete ? 'i-lucide-rotate-ccw' : 'i-lucide-check'"
          :color="isComplete ? 'neutral' : 'success'"
          :variant="isComplete ? 'ghost' : 'soft'"
          @click="emit('toggle')"
        >
          {{ isComplete ? 'Mark Incomplete' : 'Mark Complete' }}
        </UButton>
        <div class="flex gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="emit('close')"
          >
            Close
          </UButton>
          <UButton
            icon="i-lucide-pencil"
            @click="emit('edit')"
          >
            Edit
          </UButton>
        </div>
      </div>
    </template>
  </UCard>
</template>
