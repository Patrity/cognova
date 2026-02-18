<script setup lang="ts">
import { formatDistanceToNow } from 'date-fns'
import type { DashboardOverview } from '~~/shared/types'

defineProps<{
  conversations: DashboardOverview['conversations']
  loading?: boolean
}>()

function relativeTime(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true })
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-message-square"
            class="size-4 text-primary"
          />
          <span class="text-sm font-medium">Recent Chats</span>
        </div>
        <UButton
          to="/chat"
          variant="ghost"
          size="xs"
          trailing-icon="i-lucide-arrow-right"
        >
          View all
        </UButton>
      </div>
    </template>

    <div
      v-if="loading"
      class="space-y-3"
    >
      <div
        v-for="i in 3"
        :key="i"
        class="flex items-center gap-3"
      >
        <USkeleton class="size-8 rounded-full" />
        <div class="flex-1">
          <USkeleton class="h-4 w-32 mb-1" />
          <USkeleton class="h-3 w-20" />
        </div>
      </div>
    </div>

    <div
      v-else-if="conversations.length === 0"
      class="text-center py-4 text-muted text-sm"
    >
      No conversations yet
    </div>

    <div
      v-else
      class="space-y-2"
    >
      <NuxtLink
        v-for="chat in conversations"
        :key="chat.id"
        :to="{ path: '/chat', query: { conversation: chat.id } }"
        class="flex items-center gap-3 p-2 -mx-2 rounded-md hover:bg-elevated transition-colors"
      >
        <div class="flex items-center justify-center size-8 rounded-full bg-primary/10">
          <UIcon
            name="i-lucide-message-square"
            class="size-4 text-primary"
          />
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">
            {{ chat.title || 'Untitled Chat' }}
          </p>
          <p class="text-xs text-muted">
            {{ chat.messageCount }} messages
          </p>
        </div>

        <span class="text-xs text-muted whitespace-nowrap">
          {{ relativeTime(chat.startedAt) }}
        </span>
      </NuxtLink>
    </div>
  </UCard>
</template>
