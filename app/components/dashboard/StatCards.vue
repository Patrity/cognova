<script setup lang="ts">
import type { DashboardOverview } from '~~/shared/types'

defineProps<{
  overview: DashboardOverview | null
  loading?: boolean
}>()

function formatCurrency(value: number): string {
  if (value < 0.01 && value > 0) return '<$0.01'
  return `$${value.toFixed(2)}`
}

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(value)
}
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

    <template v-else-if="overview">
      <div class="p-4 rounded-lg bg-elevated border border-default">
        <div class="flex items-center gap-2 text-muted text-sm mb-1">
          <UIcon
            name="i-lucide-circle-dot"
            class="size-4"
          />
          <span>Todo</span>
        </div>
        <p class="text-2xl font-semibold">
          {{ overview.tasks.todoCount }}
        </p>
      </div>

      <div class="p-4 rounded-lg bg-elevated border border-default">
        <div class="flex items-center gap-2 text-muted text-sm mb-1">
          <UIcon
            name="i-lucide-loader"
            class="size-4"
          />
          <span>In Progress</span>
        </div>
        <p class="text-2xl font-semibold">
          {{ overview.tasks.inProgressCount }}
        </p>
      </div>

      <div class="p-4 rounded-lg bg-elevated border border-default">
        <div class="flex items-center gap-2 text-muted text-sm mb-1">
          <UIcon
            name="i-lucide-dollar-sign"
            class="size-4"
          />
          <span>7d Cost</span>
        </div>
        <p class="text-2xl font-semibold">
          {{ formatCurrency(overview.usage.totalCost7d) }}
        </p>
      </div>

      <div class="p-4 rounded-lg bg-elevated border border-default">
        <div class="flex items-center gap-2 text-muted text-sm mb-1">
          <UIcon
            name="i-lucide-zap"
            class="size-4"
          />
          <span>7d API Calls</span>
        </div>
        <p class="text-2xl font-semibold">
          {{ overview.usage.totalCalls7d }}
        </p>
      </div>

      <div class="p-4 rounded-lg bg-elevated border border-default">
        <div class="flex items-center gap-2 text-muted text-sm mb-1">
          <UIcon
            name="i-lucide-text-cursor-input"
            class="size-4"
          />
          <span>7d Tokens</span>
        </div>
        <p class="text-2xl font-semibold">
          {{ formatTokens(overview.usage.totalInputTokens7d + overview.usage.totalOutputTokens7d) }}
        </p>
      </div>
    </template>
  </div>
</template>
