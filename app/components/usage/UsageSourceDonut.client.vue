<script setup lang="ts">
import { VisSingleContainer, VisDonut } from '@unovis/vue'
import type { TokenUsageSource } from '~~/shared/types'

interface SourceData {
  source: TokenUsageSource
  cost: number
  calls: number
  tokens: number
}

const props = defineProps<{
  data: SourceData[]
  title?: string
}>()

const sourceLabels: Record<TokenUsageSource, string> = {
  chat: 'Chat',
  agent: 'Agents',
  memory_extraction: 'Memory'
}

const sourceColors: Record<TokenUsageSource, string> = {
  chat: 'var(--ui-primary)',
  agent: 'var(--ui-warning)',
  memory_extraction: 'var(--ui-info)'
}

const value = (d: SourceData) => d.cost
const color = (d: SourceData) => sourceColors[d.source] || 'var(--ui-neutral)'

const totalCost = computed(() => props.data.reduce((sum, d) => sum + d.cost, 0))
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
      class="flex items-center justify-center h-64 text-muted"
    >
      No usage data
    </div>

    <div
      v-else
      class="flex items-center gap-6"
    >
      <VisSingleContainer
        :data="data"
        class="h-48 w-48 shrink-0"
      >
        <VisDonut
          :value="value"
          :color="color"
          :arc-width="30"
          :pad-angle="0.02"
          :corner-radius="3"
        />
      </VisSingleContainer>

      <div class="flex-1 space-y-3">
        <div
          v-for="item in data"
          :key="item.source"
          class="flex items-center justify-between"
        >
          <div class="flex items-center gap-2">
            <span
              class="inline-block size-3 rounded-full"
              :style="{ background: sourceColors[item.source] }"
            />
            <span class="text-sm font-medium">{{ sourceLabels[item.source] }}</span>
          </div>
          <div class="text-right">
            <span class="text-sm font-semibold">${{ item.cost.toFixed(2) }}</span>
            <span class="text-xs text-muted ml-2">
              {{ totalCost > 0 ? Math.round((item.cost / totalCost) * 100) : 0 }}%
            </span>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
