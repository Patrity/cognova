<script setup lang="ts">
import type { Task } from '~~/shared/types'

defineProps<{
  tasks: Task[]
  loading?: boolean
}>()

const emit = defineEmits<{
  toggle: [id: string]
  edit: [task: Task]
  delete: [id: string]
  create: []
  view: [task: Task]
}>()
</script>

<template>
  <div>
    <!-- Loading state -->
    <div
      v-if="loading"
      class="flex items-center justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="size-8 animate-spin text-dimmed"
      />
    </div>

    <!-- Empty state -->
    <UCard v-else-if="tasks.length === 0">
      <div class="text-center py-8 text-dimmed">
        <UIcon
          name="i-lucide-check-square"
          class="size-12 mx-auto mb-2 opacity-50"
        />
        <p class="font-medium">
          No tasks yet
        </p>
        <p class="text-sm mt-1">
          Create your first task to get started.
        </p>
        <UButton
          class="mt-4"
          icon="i-lucide-plus"
          label="Add Task"
          @click="emit('create')"
        />
      </div>
    </UCard>

    <!-- Task list -->
    <div
      v-else
      class="space-y-2"
    >
      <TasksTaskCard
        v-for="task in tasks"
        :key="task.id"
        :task="task"
        @toggle="emit('toggle', $event)"
        @edit="emit('edit', $event)"
        @delete="emit('delete', $event)"
        @view="emit('view', $event)"
      />
    </div>
  </div>
</template>
