<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})
</script>

<template>
  <UDashboardPanel id="dashboard" grow>
    <UDashboardNavbar title="Dashboard">
      <template #actions>
        <UColorModeButton />
      </template>
    </UDashboardNavbar>

    <div class="p-6 overflow-auto">
      <div class="space-y-6">
        <div>
          <h1 class="text-2xl font-bold">Welcome to Second Brain</h1>
          <p class="text-muted mt-1">Your personal knowledge management system.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <UCard>
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-check-square" class="size-5 text-primary" />
                <span class="font-semibold">Tasks Due Today</span>
              </div>
            </template>
            <p class="text-muted text-sm">No tasks due today.</p>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-file-text" class="size-5 text-primary" />
                <span class="font-semibold">Recent Notes</span>
              </div>
            </template>
            <p class="text-muted text-sm">No recent notes.</p>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-inbox" class="size-5 text-primary" />
                <span class="font-semibold">Quick Capture</span>
              </div>
            </template>
            <UInput placeholder="What's on your mind?" class="mt-2" />
          </UCard>
        </div>
      </div>
    </div>
  </UDashboardPanel>
</template>
