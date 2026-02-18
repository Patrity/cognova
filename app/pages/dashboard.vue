<script setup lang="ts">
import type { DashboardOverview } from '~~/shared/types'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const { user } = useAuth()
const overview = ref<DashboardOverview | null>(null)
const loading = ref(true)

async function loadOverview() {
  loading.value = true
  try {
    const res = await $fetch<{ data: DashboardOverview }>('/api/dashboard/overview')
    overview.value = res.data
  } catch {
    // Silently fail — cards show empty state
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadOverview()
})
</script>

<template>
  <div class="contents">
    <UDashboardPanel
      id="dashboard"
      grow
    >
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

          <DashboardStatCards
            :overview="overview"
            :loading="loading"
          />

          <div class="grid gap-6 lg:grid-cols-2">
            <DashboardUpcomingTasks
              :tasks="overview?.tasks.upcoming ?? []"
              :loading="loading"
            />
            <DashboardRecentChats
              :conversations="overview?.conversations ?? []"
              :loading="loading"
            />
          </div>

          <div class="grid gap-6 lg:grid-cols-2">
            <DashboardRecentDocs
              :documents="overview?.documents ?? []"
              :loading="loading"
            />
            <DashboardUsageSummary
              :usage="overview?.usage ?? { totalCost7d: 0, totalCalls7d: 0, totalInputTokens7d: 0, totalOutputTokens7d: 0 }"
              :loading="loading"
            />
          </div>
        </div>
      </template>
    </UDashboardPanel>
  </div>
</template>
