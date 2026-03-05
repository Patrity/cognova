<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const { user } = useAuth()
</script>

<template>
  <UDashboardPanel grow>
    <template #header>
      <UDashboardNavbar title="Dashboard" />
    </template>

    <template #body>
      <div class="p-4 space-y-6">
        <div>
          <h1 class="text-2xl font-bold">
            Welcome back{{ user?.name ? `, ${user.name}` : '' }}
          </h1>
          <p class="text-muted mt-1 text-sm">
            Here's what's happening in your workspace.
          </p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <UCard>
            <div class="flex items-center gap-3">
              <div class="rounded-lg bg-primary/10 p-2">
                <UIcon
                  name="i-lucide-message-square"
                  class="size-5 text-primary"
                />
              </div>
              <div>
                <p class="text-sm text-muted">
                  Conversations
                </p>
                <p class="text-2xl font-bold">
                  0
                </p>
              </div>
            </div>
          </UCard>

          <UCard>
            <div class="flex items-center gap-3">
              <div class="rounded-lg bg-primary/10 p-2">
                <UIcon
                  name="i-lucide-check-square"
                  class="size-5 text-primary"
                />
              </div>
              <div>
                <p class="text-sm text-muted">
                  Tasks
                </p>
                <p class="text-2xl font-bold">
                  0
                </p>
              </div>
            </div>
          </UCard>

          <UCard>
            <div class="flex items-center gap-3">
              <div class="rounded-lg bg-primary/10 p-2">
                <UIcon
                  name="i-lucide-bot"
                  class="size-5 text-primary"
                />
              </div>
              <div>
                <p class="text-sm text-muted">
                  Active Agents
                </p>
                <p class="text-2xl font-bold">
                  0
                </p>
              </div>
            </div>
          </UCard>

          <UCard>
            <div class="flex items-center gap-3">
              <div class="rounded-lg bg-primary/10 p-2">
                <UIcon
                  name="i-lucide-coins"
                  class="size-5 text-primary"
                />
              </div>
              <div>
                <p class="text-sm text-muted">
                  Token Usage
                </p>
                <p class="text-2xl font-bold">
                  $0.00
                </p>
              </div>
            </div>
          </UCard>
        </div>

        <div class="grid gap-6 lg:grid-cols-2">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="font-semibold">
                  Recent Conversations
                </h3>
                <UButton
                  to="/chat"
                  variant="ghost"
                  size="xs"
                  trailing-icon="i-lucide-arrow-right"
                >
                  View all
                </UButton>
              </div>
            </template>
            <div class="flex flex-col items-center justify-center py-8 text-muted">
              <UIcon
                name="i-lucide-message-square"
                class="size-8 mb-2"
              />
              <p class="text-sm">
                No conversations yet
              </p>
              <UButton
                to="/chat"
                variant="soft"
                size="sm"
                class="mt-3"
              >
                Start chatting
              </UButton>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="font-semibold">
                  Tasks Summary
                </h3>
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
            <div class="flex flex-col items-center justify-center py-8 text-muted">
              <UIcon
                name="i-lucide-check-square"
                class="size-8 mb-2"
              />
              <p class="text-sm">
                No tasks yet
              </p>
              <UButton
                to="/tasks"
                variant="soft"
                size="sm"
                class="mt-3"
              >
                Create a task
              </UButton>
            </div>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
