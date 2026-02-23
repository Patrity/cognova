<script setup lang="ts">
import type { ChatConversation } from '~~/shared/types'
import { formatRelativeTime } from '~~/shared/utils/formatting'

defineProps<{
  conversations: ChatConversation[]
  activeId: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
  delete: [id: string]
  new: []
}>()
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="p-3 border-b border-default">
      <UButton
        label="New Chat"
        icon="i-lucide-plus"
        color="primary"
        variant="soft"
        block
        @click="emit('new')"
      />
    </div>

    <!-- Conversation list -->
    <div class="flex-1 overflow-y-auto">
      <div
        v-if="conversations.length === 0"
        class="p-4 text-sm text-dimmed text-center"
      >
        No conversations yet
      </div>

      <button
        v-for="conv in conversations"
        :key="conv.id"
        class="w-full p-3 text-left border-b border-default hover:bg-elevated/50 transition-colors group"
        :class="{ 'bg-elevated/50': activeId === conv.id }"
        @click="emit('select', conv.id)"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-1.5 truncate text-sm font-medium">
            <UIcon
              v-if="conv.isMain"
              name="i-lucide-pin"
              class="size-3.5 text-primary shrink-0"
            />
            {{ conv.title || 'Untitled' }}
          </div>
          <UButton
            v-if="!conv.isMain"
            icon="i-lucide-trash-2"
            variant="ghost"
            color="error"
            size="xs"
            class="opacity-0 group-hover:opacity-100 shrink-0"
            @click.stop="emit('delete', conv.id)"
          />
        </div>
        <div class="flex items-center gap-2 mt-1 text-xs text-dimmed">
          <span>{{ formatRelativeTime(conv.startedAt) }}</span>
          <span v-if="conv.messageCount">{{ conv.messageCount }} msgs</span>
          <span v-if="conv.totalCostUsd > 0">${{ conv.totalCostUsd.toFixed(4) }}</span>
        </div>
      </button>
    </div>
  </div>
</template>
