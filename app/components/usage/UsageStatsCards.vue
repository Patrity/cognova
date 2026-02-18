<script setup lang="ts">
import type { UsageStats } from '~~/shared/types'

defineProps<{
  stats: UsageStats | null
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

    <template v-else-if="stats">
      <div class="p-4 rounded-lg bg-elevated border border-default">
        <div class="flex items-center gap-2 text-muted text-sm mb-1">
          <UIcon
            name="i-lucide-dollar-sign"
            class="size-4"
          />
          <span>Total Cost</span>
        </div>
        <p class="text-2xl font-semibold">
          {{ formatCurrency(stats.totalCostUsd) }}
        </p>
      </div>

      <div class="p-4 rounded-lg bg-elevated border border-default">
        <div class="flex items-center gap-2 text-muted text-sm mb-1">
          <UIcon
            name="i-lucide-arrow-down"
            class="size-4"
          />
          <span>Input Tokens</span>
        </div>
        <p class="text-2xl font-semibold">
          {{ formatTokens(stats.totalInputTokens) }}
        </p>
      </div>

      <div class="p-4 rounded-lg bg-elevated border border-default">
        <div class="flex items-center gap-2 text-muted text-sm mb-1">
          <UIcon
            name="i-lucide-arrow-up"
            class="size-4"
          />
          <span>Output Tokens</span>
        </div>
        <p class="text-2xl font-semibold">
          {{ formatTokens(stats.totalOutputTokens) }}
        </p>
      </div>

      <div class="p-4 rounded-lg bg-elevated border border-default">
        <div class="flex items-center gap-2 text-muted text-sm mb-1">
          <UIcon
            name="i-lucide-zap"
            class="size-4"
          />
          <span>API Calls</span>
        </div>
        <p class="text-2xl font-semibold">
          {{ stats.totalCalls }}
        </p>
      </div>

      <div class="p-4 rounded-lg bg-elevated border border-default">
        <div class="flex items-center gap-2 text-muted text-sm mb-1">
          <UIcon
            name="i-lucide-calculator"
            class="size-4"
          />
          <span>Avg / Call</span>
        </div>
        <p class="text-2xl font-semibold">
          {{ formatCurrency(stats.avgCostPerCall) }}
        </p>
      </div>
    </template>
  </div>
</template>
