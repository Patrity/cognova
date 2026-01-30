<script setup lang="ts">
import type { HookEvent, HookEventStats, StatsPeriod } from '~~/shared/types'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const { fetchEvents, fetchStats } = useHookEvents()
const { agentStatsPeriod } = usePreferences()

// State
const events = ref<HookEvent[]>([])
const stats = ref<HookEventStats | null>(null)
const loading = ref(false)
const period = ref<StatsPeriod>(agentStatsPeriod.value)

// Period options
const periodOptions = [
  { label: '24h', value: '24h' as StatsPeriod },
  { label: '7d', value: '7d' as StatsPeriod },
  { label: '30d', value: '30d' as StatsPeriod }
]

// Load data
async function loadData() {
  loading.value = true
  try {
    const [statsData, eventsData] = await Promise.all([
      fetchStats(period.value),
      fetchEvents({ limit: 50 })
    ])
    stats.value = statsData
    events.value = eventsData
  } catch (e) {
    console.error('Failed to load hook data:', e)
  } finally {
    loading.value = false
  }
}

// Watch period changes
watch(period, () => {
  agentStatsPeriod.value = period.value
  loadData()
})

// Load on mount
onMounted(loadData)
</script>

<template>
  <div class="contents">
    <UDashboardPanel
      id="hooks"
      grow
    >
      <template #header>
        <UDashboardNavbar title="Hook Analytics">
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
          <!-- Stats Cards -->
          <HooksHookStatsCards
            :stats="stats"
            :loading="loading"
          />

          <!-- Activity Chart -->
          <HooksHookActivityChart
            v-if="stats && stats.dailyActivity.length > 0"
            :data="stats.dailyActivity"
            title="Daily Activity"
          />

          <!-- Two column layout for tables -->
          <div class="grid lg:grid-cols-2 gap-6">
            <!-- Tool Breakdown -->
            <HooksToolBreakdownTable
              :data="stats?.toolBreakdown ?? []"
              :loading="loading"
            />

            <!-- Event Types -->
            <UCard v-if="stats">
              <template #header>
                <p class="text-sm font-medium">
                  Events by Type
                </p>
              </template>

              <div
                v-if="!stats.eventsByType || Object.keys(stats.eventsByType).length === 0"
                class="text-center text-muted py-8"
              >
                No events by type data
              </div>

              <div
                v-else
                class="space-y-3"
              >
                <div
                  v-for="(count, type) in stats.eventsByType"
                  :key="type"
                  class="flex items-center justify-between"
                >
                  <span class="text-sm">{{ type }}</span>
                  <UBadge
                    color="neutral"
                    variant="subtle"
                  >
                    {{ count }}
                  </UBadge>
                </div>
              </div>
            </UCard>
          </div>

          <!-- Recent Events -->
          <HooksRecentEventsTable
            :events="events"
            :loading="loading"
          />

          <!-- Empty state -->
          <div
            v-if="!loading && events.length === 0 && !stats?.totalEvents"
            class="flex flex-col items-center justify-center h-64 text-neutral-500"
          >
            <UIcon
              name="i-lucide-webhook"
              class="w-12 h-12 mb-4"
            />
            <p class="text-lg font-medium">
              No hook events yet
            </p>
            <p class="text-sm text-center max-w-md">
              Hook events will appear here once Claude Code hooks are triggered.
              Make sure your hooks are configured in ~/.claude/settings.json
            </p>
          </div>
        </div>
      </template>
    </UDashboardPanel>
  </div>
</template>
