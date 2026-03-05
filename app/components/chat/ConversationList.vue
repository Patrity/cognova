<script setup lang="ts">
import type { Conversation } from '~~/shared/types'

defineProps<{
  conversations: Conversation[]
  activeId: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
  delete: [conv: Conversation]
  new: []
}>()

function formatTime(date: Date | string | undefined): string {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`

  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="flex flex-col flex-1 min-h-0">
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
        :class="{ 'bg-elevated/50 border-l-2 border-l-primary': activeId === conv.id }"
        @click="emit('select', conv.id)"
      >
        <div class="flex items-start justify-between gap-2">
          <span class="truncate text-sm font-medium">{{ conv.title || 'Untitled' }}</span>
          <UButton
            icon="i-lucide-trash-2"
            variant="ghost"
            color="error"
            size="xs"
            class="opacity-0 group-hover:opacity-100 shrink-0"
            @click.stop="emit('delete', conv)"
          />
        </div>
        <div class="flex items-center gap-2 mt-1 text-xs text-dimmed">
          <span>{{ formatTime(conv.updatedAt) }}</span>
        </div>
      </button>
    </div>
  </div>
</template>
