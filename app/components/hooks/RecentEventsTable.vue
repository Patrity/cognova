<script setup lang="ts">
import { formatDistanceToNow } from 'date-fns'
import type { HookEvent } from '~~/shared/types'

defineProps<{
  events: HookEvent[]
  loading?: boolean
}>()

function getEventTypeColor(type: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  switch (type) {
    case 'SessionStart': return 'success'
    case 'SessionEnd': return 'neutral'
    case 'PreToolUse': return 'info'
    case 'PostToolUse': return 'success'
    case 'PostToolUseFailure': return 'error'
    case 'UserPromptSubmit': return 'info'
    default: return 'neutral'
  }
}

function formatTime(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}
</script>

<template>
  <UCard>
    <template #header>
      <p class="text-sm font-medium">
        Recent Events
      </p>
    </template>

    <div
      v-if="loading"
      class="space-y-3"
    >
      <USkeleton
        v-for="i in 10"
        :key="i"
        class="h-10 w-full"
      />
    </div>

    <div
      v-else-if="events.length === 0"
      class="text-center text-muted py-8"
    >
      No events recorded yet
    </div>

    <UTable
      v-else
      :data="events"
      :columns="[
        { key: 'eventType', label: 'Event' },
        { key: 'toolName', label: 'Tool' },
        { key: 'blocked', label: 'Status' },
        { key: 'durationMs', label: 'Duration' },
        { key: 'createdAt', label: 'Time' }
      ]"
    >
      <template #eventType-cell="{ row }">
        <UBadge
          :color="getEventTypeColor(row.original.eventType)"
          variant="subtle"
          size="sm"
        >
          {{ row.original.eventType }}
        </UBadge>
      </template>
      <template #toolName-cell="{ row }">
        <span
          v-if="row.original.toolName"
          class="font-mono text-sm"
        >
          {{ row.original.toolName }}
        </span>
        <span
          v-else
          class="text-muted"
        >
          -
        </span>
      </template>
      <template #blocked-cell="{ row }">
        <UBadge
          v-if="row.original.blocked"
          color="error"
          variant="subtle"
          size="sm"
        >
          Blocked
        </UBadge>
        <UBadge
          v-else
          color="success"
          variant="subtle"
          size="sm"
        >
          Allowed
        </UBadge>
      </template>
      <template #durationMs-cell="{ row }">
        <span v-if="row.original.durationMs">
          {{ row.original.durationMs }}ms
        </span>
        <span
          v-else
          class="text-muted"
        >
          -
        </span>
      </template>
      <template #createdAt-cell="{ row }">
        <span class="text-muted text-sm">
          {{ formatTime(row.original.createdAt) }}
        </span>
      </template>
    </UTable>
  </UCard>
</template>
