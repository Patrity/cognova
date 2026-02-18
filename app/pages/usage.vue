<script setup lang="ts">
import type { StatsPeriod, UsageStats } from '~~/shared/types'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const { usageStatsPeriod } = usePreferences()
const period = ref<StatsPeriod>(usageStatsPeriod.value)
const granularity = ref<'daily' | 'hourly'>('daily')
const stats = ref<UsageStats | null>(null)
const loading = ref(false)

const periodOptions = [
  { label: '24h', value: '24h' as StatsPeriod },
  { label: '7d', value: '7d' as StatsPeriod },
  { label: '30d', value: '30d' as StatsPeriod }
]

async function loadStats() {
  loading.value = true
  try {
    const res = await $fetch<{ data: UsageStats }>('/api/usage/stats', {
      query: {
        period: period.value,
        granularity: granularity.value,
        tzOffset: new Date().getTimezoneOffset()
      }
    })
    stats.value = res.data
  } catch {
    // Silently fail
  } finally {
    loading.value = false
  }
}

watch(period, (value) => {
  usageStatsPeriod.value = value
  loadStats()
})

watch(granularity, () => {
  loadStats()
})

onMounted(() => {
  loadStats()
})
</script>

<template>
  <div class="contents">
    <UDashboardPanel
      id="usage"
      grow
    >
      <template #header>
        <UDashboardNavbar title="Token Usage">
          <template #right>
            <UFieldGroup>
              <UButton
                v-for="opt in periodOptions"
                :key="opt.value"
                :color="period === opt.value ? 'primary' : 'neutral'"
                :variant="period === opt.value ? 'solid' : 'ghost'"
                size="sm"
                @click="period = opt.value"
              >
                {{ opt.label }}
              </UButton>
            </UFieldGroup>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div class="p-4 space-y-6">
          <UsageStatsCards
            :stats="stats"
            :loading="loading"
          />

          <UsageCostChart
            v-if="stats && stats.dailyUsage.length > 0"
            v-model:granularity="granularity"
            :data="stats.dailyUsage"
            title="Cost Over Time"
          />

          <div class="grid gap-6 lg:grid-cols-2">
            <UsageSourceDonut
              v-if="stats && stats.bySource.length > 0"
              :data="stats.bySource"
              title="Cost by Source"
            />

            <UsageTopConsumers
              v-if="stats && stats.topConsumers.length > 0"
              :data="stats.topConsumers"
              title="Top Consumers"
            />
          </div>

          <UsageRecordsTable
            v-if="stats && stats.totalCalls > 0"
            :period="period"
          />

          <div
            v-if="!loading && stats && stats.totalCalls === 0"
            class="flex flex-col items-center justify-center h-64 text-muted"
          >
            <UIcon
              name="i-lucide-bar-chart-3"
              class="size-12 mb-4"
            />
            <p class="text-lg font-medium">
              No usage data yet
            </p>
            <p class="text-sm mt-1">
              Token usage will appear here once you start using chat or agents
            </p>
          </div>
        </div>
      </template>
    </UDashboardPanel>
  </div>
</template>
