<script setup lang="ts">
interface UsageStats {
  totalCost: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCalls: number
}

withDefaults(defineProps<{
  stats: UsageStats | null
  loading?: boolean
}>(), {
  loading: false
})

function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000)
    return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000)
    return `${(tokens / 1_000).toFixed(1)}K`
  return tokens.toString()
}
</script>

<template>
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <UCard>
      <div class="text-sm text-muted">
        Total Cost
      </div>
      <div class="text-2xl font-semibold mt-1">
        <template v-if="loading">
          —
        </template>
        <template v-else>
          {{ formatCost(stats?.totalCost || 0) }}
        </template>
      </div>
    </UCard>
    <UCard>
      <div class="text-sm text-muted">
        API Calls
      </div>
      <div class="text-2xl font-semibold mt-1">
        <template v-if="loading">
          —
        </template>
        <template v-else>
          {{ stats?.totalCalls || 0 }}
        </template>
      </div>
    </UCard>
    <UCard>
      <div class="text-sm text-muted">
        Input Tokens
      </div>
      <div class="text-2xl font-semibold mt-1">
        <template v-if="loading">
          —
        </template>
        <template v-else>
          {{ formatTokens(stats?.totalInputTokens || 0) }}
        </template>
      </div>
    </UCard>
    <UCard>
      <div class="text-sm text-muted">
        Output Tokens
      </div>
      <div class="text-2xl font-semibold mt-1">
        <template v-if="loading">
          —
        </template>
        <template v-else>
          {{ formatTokens(stats?.totalOutputTokens || 0) }}
        </template>
      </div>
    </UCard>
  </div>
</template>
