<script setup lang="ts">
import type { TokenUsageSource, UsageDisplayMode } from '~~/shared/types'

interface Consumer {
  name: string
  source: TokenUsageSource
  cost: number
  calls: number
  tokens: number
}

const props = defineProps<{
  data: Consumer[]
  title?: string
  displayMode?: UsageDisplayMode
}>()

const sourceLabels: Record<TokenUsageSource, string> = {
  chat: 'Chat',
  agent: 'Agent',
  memory_extraction: 'Memory'
}

const sourceColors = {
  chat: 'primary',
  agent: 'warning',
  memory_extraction: 'info'
} as const

const isTokens = computed(() => props.displayMode === 'tokens')

function formatCurrency(value: number): string {
  if (value < 0.01 && value > 0) return '<$0.01'
  return `$${value.toFixed(4)}`
}

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(value)
}
</script>

<template>
  <UCard>
    <template
      v-if="title"
      #header
    >
      <p class="text-sm font-medium">
        {{ title }}
      </p>
    </template>

    <div
      v-if="data.length === 0"
      class="flex items-center justify-center h-32 text-muted"
    >
      No usage data
    </div>

    <div
      v-else
      class="divide-y divide-default"
    >
      <div
        v-for="(item, index) in data"
        :key="`${item.source}-${item.name}`"
        class="flex items-center justify-between py-2.5"
        :class="{ 'pt-0': index === 0 }"
      >
        <div class="flex items-center gap-3 min-w-0">
          <span class="text-sm text-muted w-5 text-right shrink-0">{{ index + 1 }}</span>
          <div class="min-w-0">
            <p class="text-sm font-medium truncate">
              {{ item.name }}
            </p>
            <UBadge
              :color="sourceColors[item.source]"
              variant="subtle"
              size="xs"
            >
              {{ sourceLabels[item.source] }}
            </UBadge>
          </div>
        </div>

        <div class="text-right shrink-0 ml-4">
          <p class="text-sm font-semibold">
            {{ isTokens ? formatTokens(item.tokens) : formatCurrency(item.cost) }}
          </p>
          <p class="text-xs text-muted">
            {{ item.calls }} {{ item.calls === 1 ? 'call' : 'calls' }}
          </p>
        </div>
      </div>
    </div>
  </UCard>
</template>
