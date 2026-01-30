<script setup lang="ts">
import { format } from 'date-fns'
import { useElementSize } from '@vueuse/core'
import { VisXYContainer, VisStackedBar, VisAxis, VisCrosshair, VisTooltip } from '@unovis/vue'
import type { HookDailyData } from '~~/shared/types'

const props = defineProps<{
  data: HookDailyData[]
  title?: string
  height?: string
}>()

const cardRef = useTemplateRef<HTMLElement | null>('cardRef')
const { width } = useElementSize(cardRef)

// X accessor - use index
const x = (_: HookDailyData, i: number) => i

// Y accessors for stacked bar - blocked and allowed
const y = [
  (d: HookDailyData) => d.allowed,
  (d: HookDailyData) => d.blocked
]

// Colors for the stacked bars
const colors = ['var(--ui-success)', 'var(--ui-error)']

// Format X axis ticks
const xTicks = (i: number) => {
  const item = props.data[i]
  if (!item) return ''
  return format(new Date(item.date), 'd MMM')
}

// Tooltip template
const template = (d: HookDailyData) => {
  return `<div class="p-2 text-sm">
    <div class="font-medium">${format(new Date(d.date), 'MMM d, yyyy')}</div>
    <div class="text-success">Allowed: ${d.allowed}</div>
    <div class="text-error">Blocked: ${d.blocked}</div>
    <div class="text-muted">Total: ${d.total}</div>
  </div>`
}
</script>

<template>
  <UCard
    ref="cardRef"
    :ui="{ root: 'overflow-visible', body: '!px-0 !pt-0 !pb-3' }"
  >
    <template
      v-if="title"
      #header
    >
      <div class="flex items-center justify-between">
        <p class="text-sm font-medium">
          {{ title }}
        </p>
        <div class="flex items-center gap-4 text-xs">
          <span class="flex items-center gap-1">
            <span class="w-3 h-3 rounded bg-success" />
            Allowed
          </span>
          <span class="flex items-center gap-1">
            <span class="w-3 h-3 rounded bg-error" />
            Blocked
          </span>
        </div>
      </div>
    </template>

    <div
      v-if="data.length === 0"
      class="flex items-center justify-center h-48 text-muted"
    >
      No activity data
    </div>

    <VisXYContainer
      v-else
      :data="data"
      :padding="{ top: 10, left: 10, right: 10, bottom: 10 }"
      :class="height || 'h-48'"
      :width="width"
    >
      <VisStackedBar
        :x="x"
        :y="y"
        :color="colors"
        :bar-padding="0.2"
      />
      <VisAxis
        type="x"
        :x="x"
        :tick-format="xTicks"
      />
      <VisCrosshair
        color="var(--ui-primary)"
        :template="template"
      />
      <VisTooltip />
    </VisXYContainer>
  </UCard>
</template>

<style scoped>
.unovis-xy-container {
  --vis-crosshair-line-stroke-color: var(--ui-primary);
  --vis-crosshair-circle-stroke-color: var(--ui-bg);
  --vis-axis-grid-color: var(--ui-border);
  --vis-axis-tick-color: var(--ui-border);
  --vis-axis-tick-label-color: var(--ui-text-dimmed);
  --vis-tooltip-background-color: var(--ui-bg);
  --vis-tooltip-border-color: var(--ui-border);
  --vis-tooltip-text-color: var(--ui-text-highlighted);
}
</style>
