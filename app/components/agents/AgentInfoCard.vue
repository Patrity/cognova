<script setup lang="ts">
import type { CronAgent } from '~~/shared/types'
import { formatSchedule, formatRelativeTime } from '~~/shared/utils/formatting'

defineProps<{
  agent: CronAgent
}>()
</script>

<template>
  <UCard>
    <div class="space-y-3">
      <div v-if="agent.description">
        <p class="text-sm text-muted uppercase mb-1">
          Description
        </p>
        <p>{{ agent.description }}</p>
      </div>

      <div class="flex flex-wrap gap-6">
        <div>
          <p class="text-sm text-muted uppercase mb-1">
            Schedule
          </p>
          <p class="flex items-center gap-2">
            <UIcon name="i-lucide-clock" />
            {{ formatSchedule(agent.schedule) }}
            <span class="text-sm text-muted">({{ agent.schedule }})</span>
          </p>
        </div>

        <div v-if="agent.maxBudgetUsd">
          <p class="text-sm text-muted uppercase mb-1">
            Budget Limit
          </p>
          <p class="flex items-center gap-2">
            <UIcon name="i-lucide-dollar-sign" />
            ${{ agent.maxBudgetUsd }} per run
          </p>
        </div>

        <div v-if="agent.lastRunAt">
          <p class="text-sm text-muted uppercase mb-1">
            Last Run
          </p>
          <p class="flex items-center gap-2">
            <UIcon name="i-lucide-activity" />
            {{ formatRelativeTime(agent.lastRunAt) }}
          </p>
        </div>
      </div>
    </div>
  </UCard>
</template>
