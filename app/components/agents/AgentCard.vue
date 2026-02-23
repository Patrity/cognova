<script setup lang="ts">
import type { CronAgent } from '~~/shared/types'
import { formatSchedule, formatRelativeTime, getStatusColor } from '~~/shared/utils/formatting'

defineProps<{
  agent: CronAgent
  running: boolean
}>()

const emit = defineEmits<{
  toggle: [id: string]
  run: [id: string, event: Event]
  cancel: [id: string, event: Event]
  edit: [agent: CronAgent, event: Event]
  navigate: [agent: CronAgent]
}>()
</script>

<template>
  <UCard
    class="cursor-pointer transition-all hover:ring-2 hover:ring-primary/50"
    @click="emit('navigate', agent)"
  >
    <div class="flex items-start justify-between gap-4">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <h3 class="font-medium truncate">
            {{ agent.name }}
          </h3>
          <UBadge
            v-if="running"
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
            v-else-if="agent.lastStatus"
            :color="getStatusColor(agent.lastStatus)"
            size="sm"
          >
            {{ agent.lastStatus }}
          </UBadge>
        </div>

        <p
          v-if="agent.description"
          class="text-sm text-muted truncate mt-1"
        >
          {{ agent.description }}
        </p>

        <div class="flex items-center gap-4 mt-2 text-sm text-muted">
          <span class="flex items-center gap-1">
            <UIcon name="i-lucide-clock" />
            {{ formatSchedule(agent.schedule) }}
          </span>
          <span
            v-if="agent.lastRunAt"
            class="flex items-center gap-1"
          >
            <UIcon name="i-lucide-activity" />
            {{ formatRelativeTime(agent.lastRunAt) }}
          </span>
          <span
            v-if="agent.maxBudgetUsd"
            class="flex items-center gap-1"
          >
            <UIcon name="i-lucide-dollar-sign" />
            ${{ agent.maxBudgetUsd }} limit
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <USwitch
          :model-value="agent.enabled"
          @click.stop
          @update:model-value="emit('toggle', agent.id)"
        />
        <UButton
          v-if="running"
          icon="i-lucide-square"
          variant="ghost"
          size="sm"
          color="error"
          @click.stop="emit('cancel', agent.id, $event)"
        />
        <UButton
          v-else
          icon="i-lucide-play"
          variant="ghost"
          size="sm"
          :disabled="!agent.enabled"
          @click.stop="emit('run', agent.id, $event)"
        />
        <UButton
          icon="i-lucide-pencil"
          variant="ghost"
          size="sm"
          @click.stop="emit('edit', agent, $event)"
        />
      </div>
    </div>
  </UCard>
</template>
