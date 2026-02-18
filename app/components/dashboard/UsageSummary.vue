<script setup lang="ts">
import type { DashboardOverview } from '~~/shared/types'

defineProps<{
  usage: DashboardOverview['usage']
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
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-bar-chart-3"
            class="size-4 text-primary"
          />
          <span class="text-sm font-medium">Token Usage (7d)</span>
        </div>
        <UButton
          to="/usage"
          variant="ghost"
          size="xs"
          trailing-icon="i-lucide-arrow-right"
        >
          Details
        </UButton>
      </div>
    </template>

    <div
      v-if="loading"
      class="grid grid-cols-2 gap-4"
    >
      <div
        v-for="i in 4"
        :key="i"
      >
        <USkeleton class="h-3 w-12 mb-1" />
        <USkeleton class="h-6 w-16" />
      </div>
    </div>

    <div
      v-else
      class="grid grid-cols-2 gap-4"
    >
      <div>
        <p class="text-xs text-muted mb-0.5">
          Total Cost
        </p>
        <p class="text-lg font-semibold">
          {{ formatCurrency(usage.totalCost7d) }}
        </p>
      </div>
      <div>
        <p class="text-xs text-muted mb-0.5">
          API Calls
        </p>
        <p class="text-lg font-semibold">
          {{ usage.totalCalls7d }}
        </p>
      </div>
      <div>
        <p class="text-xs text-muted mb-0.5">
          Input Tokens
        </p>
        <p class="text-lg font-semibold">
          {{ formatTokens(usage.totalInputTokens7d) }}
        </p>
      </div>
      <div>
        <p class="text-xs text-muted mb-0.5">
          Output Tokens
        </p>
        <p class="text-lg font-semibold">
          {{ formatTokens(usage.totalOutputTokens7d) }}
        </p>
      </div>
    </div>
  </UCard>
</template>
