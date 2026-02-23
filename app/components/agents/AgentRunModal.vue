<script setup lang="ts">
import type { CronAgentRun } from '~~/shared/types'
import { formatDuration, formatDateTime, getStatusColor } from '~~/shared/utils/formatting'

defineProps<{
  run: CronAgentRun | null
}>()

const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <UModal
    v-model:open="open"
    :title="run ? `Run Details` : 'Run Details'"
    :ui="{ content: 'sm:max-w-3xl' }"
  >
    <template #content>
      <div
        v-if="run"
        class="p-4 space-y-4"
      >
        <!-- Status and metadata -->
        <div class="flex flex-wrap items-center gap-4">
          <UBadge
            :color="getStatusColor(run.status)"
            size="lg"
          >
            {{ run.status }}
          </UBadge>
          <span class="text-sm text-muted">
            Started: {{ formatDateTime(run.startedAt) }}
          </span>
          <span
            v-if="run.completedAt"
            class="text-sm text-muted"
          >
            Completed: {{ formatDateTime(run.completedAt) }}
          </span>
        </div>

        <!-- Metrics -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/5">
          <div>
            <p class="text-xs text-muted uppercase">
              Duration
            </p>
            <p class="font-medium">
              {{ formatDuration(run.durationMs) }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted uppercase">
              Cost
            </p>
            <p class="font-medium">
              {{ run.costUsd ? `$${run.costUsd.toFixed(4)}` : '-' }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted uppercase">
              Input Tokens
            </p>
            <p class="font-medium">
              {{ run.inputTokens?.toLocaleString() || '-' }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted uppercase">
              Output Tokens
            </p>
            <p class="font-medium">
              {{ run.outputTokens?.toLocaleString() || '-' }}
            </p>
          </div>
        </div>

        <!-- Error message -->
        <div
          v-if="run.error"
          class="p-4 rounded-lg bg-error-500/10 border border-error-500/20"
        >
          <p class="text-sm font-medium text-error-500 mb-2">
            Error
          </p>
          <pre class="text-sm text-error-400 whitespace-pre-wrap font-mono overflow-x-auto">{{ run.error }}</pre>
        </div>

        <!-- Output -->
        <div v-if="run.output">
          <p class="text-sm font-medium mb-2">
            Output
          </p>
          <div class="max-h-96 overflow-auto rounded-lg bg-muted/5 border border-default">
            <pre class="p-4 text-sm whitespace-pre-wrap font-mono">{{ run.output }}</pre>
          </div>
        </div>

        <div
          v-if="!run.output && !run.error && run.status === 'running'"
          class="text-center text-muted py-8"
        >
          <UIcon
            name="i-lucide-loader-2"
            class="size-8 animate-spin mb-2"
          />
          <p>Agent is currently running...</p>
        </div>
      </div>

      <div
        v-else
        class="p-4 text-center text-muted"
      >
        No run selected
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end">
        <UButton
          color="neutral"
          variant="ghost"
          @click="open = false"
        >
          Close
        </UButton>
      </div>
    </template>
  </UModal>
</template>
