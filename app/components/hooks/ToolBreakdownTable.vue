<script setup lang="ts">
import type { HookToolBreakdown } from '~~/shared/types'

defineProps<{
  data: HookToolBreakdown[]
  loading?: boolean
}>()

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

function getBlockRateColor(blocked: number, total: number): string {
  const rate = total > 0 ? (blocked / total) * 100 : 0
  if (rate > 50) return 'text-error'
  if (rate > 25) return 'text-warning'
  return 'text-success'
}
</script>

<template>
  <UCard>
    <template #header>
      <p class="text-sm font-medium">
        Tool Usage Breakdown
      </p>
    </template>

    <div
      v-if="loading"
      class="space-y-3"
    >
      <USkeleton
        v-for="i in 5"
        :key="i"
        class="h-10 w-full"
      />
    </div>

    <div
      v-else-if="data.length === 0"
      class="text-center text-muted py-8"
    >
      No tool usage data yet
    </div>

    <UTable
      v-else
      :data="data"
      :columns="[
        { accessorKey: 'toolName', header: 'Tool' },
        { accessorKey: 'total', header: 'Total' },
        { accessorKey: 'blocked', header: 'Blocked' },
        { accessorKey: 'avgDurationMs', header: 'Avg Duration' }
      ]"
    >
      <template #toolName-cell="{ row }">
        <span class="font-mono text-sm">{{ row.original.toolName }}</span>
      </template>
      <template #blocked-cell="{ row }">
        <span :class="getBlockRateColor(row.original.blocked, row.original.total)">
          {{ row.original.blocked }}
        </span>
      </template>
      <template #avgDurationMs-cell="{ row }">
        {{ formatDuration(row.original.avgDurationMs) }}
      </template>
    </UTable>
  </UCard>
</template>
