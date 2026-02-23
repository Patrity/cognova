<script setup lang="ts">
import type { HookEventStats } from '~~/shared/types'
import { formatDuration } from '~~/shared/utils/formatting'

const props = defineProps<{
  stats: HookEventStats | null
  loading?: boolean
}>()

const displayStats = computed(() => {
  if (!props.stats) return []
  const s = props.stats
  return [
    { title: 'Total Events', icon: 'i-lucide-activity', value: s.totalEvents },
    { title: 'Blocked', icon: 'i-lucide-shield-alert', value: s.blockedEvents, color: 'text-error' },
    { title: 'Block Rate', icon: 'i-lucide-percent', value: `${s.blockRate}%` },
    { title: 'Avg Duration', icon: 'i-lucide-clock', value: formatDuration(s.avgDurationMs) },
    { title: 'Sessions', icon: 'i-lucide-users', value: s.recentSessions.length }
  ]
})
</script>

<template>
  <div class="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
    <template v-if="loading">
      <div
        v-for="i in 5"
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
        <p
          class="text-2xl font-semibold"
          :class="stat.color"
        >
          {{ stat.value }}
        </p>
      </div>
    </template>
  </div>
</template>
