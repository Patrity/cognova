<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})
</script>

<template>
  <UDashboardPanel id="tasks" grow>
    <template #header>
      <UDashboardNavbar title="Tasks">
        <template #actions>
          <UButton icon="i-lucide-plus" label="Add Task" />
          <UColorModeButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <div class="flex items-center gap-4">
          <USelect
            placeholder="All Status"
            :options="[
              { label: 'All Status', value: '' },
              { label: 'Todo', value: 'todo' },
              { label: 'In Progress', value: 'in_progress' },
              { label: 'Done', value: 'done' },
              { label: 'Blocked', value: 'blocked' }
            ]"
            class="w-40"
          />
          <USelect
            placeholder="All Projects"
            :options="[{ label: 'All Projects', value: '' }]"
            class="w-40"
          />
          <UInput
            placeholder="Search tasks..."
            icon="i-lucide-search"
            class="flex-1"
          />
        </div>

        <UCard>
          <div class="text-center py-8 text-muted">
            <UIcon name="i-lucide-check-square" class="size-12 mx-auto mb-2 opacity-50" />
            <p>No tasks yet.</p>
            <p class="text-sm">Create your first task with the "Add Task" button.</p>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
