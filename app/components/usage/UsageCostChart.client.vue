<script setup lang="ts">
import { format } from 'date-fns'
import { useElementSize } from '@vueuse/core'
import { VisXYContainer, VisLine, VisArea, VisAxis, VisCrosshair, VisTooltip } from '@unovis/vue'
import type { DailyUsageData, UsageDisplayMode } from '~~/shared/types'

const props = defineProps<{
  data: DailyUsageData[]
  title?: string
  granularity: 'daily' | 'hourly'
  displayMode?: UsageDisplayMode
}>()

const emit = defineEmits<{
  'update:granularity': [value: 'daily' | 'hourly']
}>()

const cardRef = useTemplateRef<HTMLElement | null>('cardRef')
const { width } = useElementSize(cardRef)

const isTokens = computed(() => props.displayMode === 'tokens')

const x = (_: DailyUsageData, i: number) => i

const yTotal = (d: DailyUsageData) =>
  isTokens.value ? d.inputTokens + d.outputTokens : d.totalCost

// Parse "2026-02-18" as local date (not UTC) to avoid off-by-one in western timezones
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number) as [number, number, number]
  return new Date(y, m - 1, d)
}

const xTicks = (i: number) => {
  const item = props.data[i]
  if (!item) return ''
  if (props.granularity === 'hourly') {
    const hour = Number(item.date.slice(11, 13))
    const ampm = hour >= 12 ? 'pm' : 'am'
    const h12 = hour % 12 || 12
    if (i === 0 || item.date.slice(0, 10) !== props.data[i - 1]?.date.slice(0, 10))
      return `${format(parseLocalDate(item.date), 'MMM d')} ${h12}${ampm}`
    return `${h12}${ampm}`
  }
  return format(parseLocalDate(item.date), 'd MMM')
}

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(value)
}

const template = (d: DailyUsageData) => {
  let label: string
  if (props.granularity === 'hourly') {
    const hour = Number(d.date.slice(11, 13))
    const ampm = hour >= 12 ? 'pm' : 'am'
    const h12 = hour % 12 || 12
    label = `${format(parseLocalDate(d.date), 'MMM d, yyyy')} ${h12}:00${ampm}`
  } else {
    label = format(parseLocalDate(d.date), 'MMM d, yyyy')
  }
  if (isTokens.value)
    return `<div class="p-2 text-sm">
      <div class="font-medium">${label}</div>
      <div style="color: var(--ui-primary)">Input: ${formatTokens(d.inputTokens)}</div>
      <div style="color: var(--ui-warning)">Output: ${formatTokens(d.outputTokens)}</div>
      <div class="text-muted mt-1">Total: ${formatTokens(d.inputTokens + d.outputTokens)}</div>
      <div class="text-muted">${d.calls} calls</div>
    </div>`
  return `<div class="p-2 text-sm">
    <div class="font-medium">${label}</div>
    <div style="color: var(--ui-primary)">Chat: $${d.chat.toFixed(4)}</div>
    <div style="color: var(--ui-warning)">Agents: $${d.agent.toFixed(4)}</div>
    <div style="color: var(--ui-info)">Memory: $${d.memory.toFixed(4)}</div>
    <div class="text-muted mt-1">Total: $${d.totalCost.toFixed(4)}</div>
    <div class="text-muted">${d.calls} calls</div>
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
        <div class="flex items-center gap-3">
          <p class="text-sm font-medium">
            {{ title }}
          </p>
          <UFieldGroup>
            <UButton
              :color="granularity === 'daily' ? 'primary' : 'neutral'"
              :variant="granularity === 'daily' ? 'solid' : 'ghost'"
              size="xs"
              @click="emit('update:granularity', 'daily')"
            >
              Daily
            </UButton>
            <UButton
              :color="granularity === 'hourly' ? 'primary' : 'neutral'"
              :variant="granularity === 'hourly' ? 'solid' : 'ghost'"
              size="xs"
              @click="emit('update:granularity', 'hourly')"
            >
              Hourly
            </UButton>
          </UFieldGroup>
        </div>
        <div class="flex items-center gap-3 text-xs text-muted">
          <template v-if="isTokens">
            <span class="flex items-center gap-1">
              <span
                class="inline-block size-2.5 rounded-full"
                style="background: var(--ui-primary)"
              />
              Input
            </span>
            <span class="flex items-center gap-1">
              <span
                class="inline-block size-2.5 rounded-full"
                style="background: var(--ui-warning)"
              />
              Output
            </span>
          </template>
          <template v-else>
            <span class="flex items-center gap-1">
              <span
                class="inline-block size-2.5 rounded-full"
                style="background: var(--ui-primary)"
              />
              Chat
            </span>
            <span class="flex items-center gap-1">
              <span
                class="inline-block size-2.5 rounded-full"
                style="background: var(--ui-warning)"
              />
              Agents
            </span>
            <span class="flex items-center gap-1">
              <span
                class="inline-block size-2.5 rounded-full"
                style="background: var(--ui-info)"
              />
              Memory
            </span>
          </template>
        </div>
      </div>
    </template>

    <div
      v-if="data.length === 0"
      class="flex items-center justify-center h-64 text-muted"
    >
      No usage data
    </div>

    <VisXYContainer
      v-else
      :data="data"
      :padding="{ top: 10, left: 10, right: 10, bottom: 10 }"
      class="h-64"
      :width="width"
    >
      <VisArea
        :x="x"
        :y="yTotal"
        color="var(--ui-primary)"
        :opacity="0.1"
      />
      <VisLine
        :x="x"
        :y="yTotal"
        color="var(--ui-primary)"
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
