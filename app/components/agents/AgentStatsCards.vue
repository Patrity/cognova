<script setup lang="ts">
import type { AgentGlobalStats, AgentDetailStats } from '~~/shared/types'

const props = defineProps<{
  stats: AgentGlobalStats | AgentDetailStats | null
  variant: 'global' | 'detail'
  loading?: boolean
}>()

function formatCurrency(value: number): string {
  if (value < 0.01) return '<$0.01'
  return `$${value.toFixed(2)}`
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

const globalStats = computed(() => {
  if (props.variant !== 'global' || !props.stats) return []
  const s = props.stats as AgentGlobalStats
  return [
    { title: 'Total Agents', icon: 'i-lucide-bot', value: s.totalAgents },
    { title: 'Active', icon: 'i-lucide-play-circle', value: s.activeAgents },
    { title: 'Runs', icon: 'i-lucide-activity', value: s.runsInPeriod },
    { title: 'Success Rate', icon: 'i-lucide-check-circle', value: `${s.successRate}%` },
    { title: 'Total Cost', icon: 'i-lucide-dollar-sign', value: formatCurrency(s.totalCostUsd) }
  ]
})

const detailStats = computed(() => {
  if (props.variant !== 'detail' || !props.stats) return []
  const s = props.stats as AgentDetailStats
  return [
    { title: 'Total Runs', icon: 'i-lucide-activity', value: s.totalRuns },
    { title: 'Success Rate', icon: 'i-lucide-check-circle', value: `${s.successRate}%` },
    { title: 'Avg Duration', icon: 'i-lucide-clock', value: formatDuration(s.avgDurationMs) },
    { title: 'Total Cost', icon: 'i-lucide-dollar-sign', value: formatCurrency(s.totalCostUsd) },
    { title: 'Last Run', icon: 'i-lucide-calendar', value: formatRelativeTime(s.lastRunAt) }
  ]
})

const displayStats = computed(() => props.variant === 'global' ? globalStats.value : detailStats.value)
</script>

<template>
  <div
    class="grid gap-4"
    :class="variant === 'global' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'"
  >
    <template v-if="loading">
      <div
        v-for="i in (variant === 'global' ? 5 : 5)"
        :key="i"
        class="p-4 rounded-lg bg-elevated border border-default"
      >
        <USkeleton class="h-4 w-16 mb-2" />
        <USkeleton class="h-8 w-12" />
      </div>
    </template>

    <template v-else-if="stats">
      <div
        v-for="stat in displayStats"
        :key="stat.title"
        class="p-4 rounded-lg bg-elevated border border-default"
      >
        <div class="flex items-center gap-2 text-muted text-sm mb-1">
          <UIcon
            :name="stat.icon"
            class="size-4"
          />
          <span>{{ stat.title }}</span>
        </div>
        <p class="text-2xl font-semibold">
          {{ stat.value }}
        </p>
      </div>
    </template>
  </div>
</template>
