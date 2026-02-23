<script setup lang="ts">
import type { CronAgentRun } from '~~/shared/types'
import { formatDuration, formatDateTime, getStatusColor } from '~~/shared/utils/formatting'

defineProps<{
  runs: CronAgentRun[]
  loading: boolean
}>()

const emit = defineEmits<{
  select: [run: CronAgentRun]
}>()

function truncateOutput(output?: string, maxLength = 100) {
  if (!output) return '-'
  if (output.length <= maxLength) return output
  return output.substring(0, maxLength) + '...'
}
</script>

<template>
  <div class="space-y-4">
    <h2 class="text-lg font-semibold">
      Run History
    </h2>

    <!-- Loading runs -->
    <div
      v-if="loading"
      class="flex items-center justify-center h-32"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="w-6 h-6 animate-spin text-neutral-400"
      />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="runs.length === 0"
      class="flex flex-col items-center justify-center h-32 text-neutral-500"
    >
      <UIcon
        name="i-lucide-history"
        class="w-8 h-8 mb-2"
      />
      <p>No runs yet</p>
    </div>

    <!-- Run list -->
    <div
      v-else
      class="space-y-2"
    >
      <UCard
        v-for="run in runs"
        :key="run.id"
        class="cursor-pointer transition-all hover:ring-2 hover:ring-primary/50"
        @click="emit('select', run)"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <UBadge
                v-if="run.status === 'running'"
                color="info"
                variant="subtle"
                size="sm"
              >
                <UIcon
                  name="i-lucide-loader-2"
                  class="w-3 h-3 animate-spin mr-1"
                />
                Running
              </UBadge>
              <UBadge
                v-else
                :color="getStatusColor(run.status)"
                size="sm"
              >
                {{ run.status }}
              </UBadge>
              <span class="text-sm text-muted">
                {{ formatDateTime(run.startedAt) }}
              </span>
            </div>

            <p class="text-sm text-muted truncate">
              {{ run.error ? truncateOutput(run.error) : truncateOutput(run.output) }}
            </p>
          </div>

          <div class="text-right text-sm text-muted shrink-0">
            <p>{{ formatDuration(run.durationMs) }}</p>
            <p v-if="run.costUsd">
              ${{ run.costUsd.toFixed(4) }}
            </p>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
