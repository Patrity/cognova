<script setup lang="ts">
import { format } from 'date-fns'
import { useElementSize } from '@vueuse/core'
import { VisXYContainer, VisLine, VisArea, VisAxis, VisCrosshair, VisTooltip } from '@unovis/vue'
import type { DailyRunData } from '~~/shared/types'

const props = defineProps<{
  data: DailyRunData[]
  title?: string
  height?: string
}>()

const cardRef = useTemplateRef<HTMLElement | null>('cardRef')
const { width } = useElementSize(cardRef)

// X accessor - use index
const x = (_: DailyRunData, i: number) => i

// Y accessor - total runs
const y = (d: DailyRunData) => d.total

// Format X axis ticks
const xTicks = (i: number) => {
  const item = props.data[i]
  if (!item) return ''
  return format(new Date(item.date), 'd MMM')
}

// Tooltip template
const template = (d: DailyRunData) => {
  return `<div class="p-2 text-sm">
    <div class="font-medium">${format(new Date(d.date), 'MMM d, yyyy')}</div>
    <div class="text-success">Success: ${d.success}</div>
    <div class="text-error">Errors: ${d.error}</div>
    <div class="text-muted">Total: ${d.total}</div>
    <div class="text-muted">Cost: $${d.costUsd.toFixed(4)}</div>
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
      <p class="text-sm font-medium">
        {{ title }}
      </p>
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
      <VisLine
        :x="x"
        :y="y"
        color="var(--ui-primary)"
      />
      <VisArea
        :x="x"
        :y="y"
        color="var(--ui-primary)"
        :opacity="0.1"
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
