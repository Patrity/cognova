<script setup lang="ts">
import { refDebounced } from '@vueuse/core'

const props = defineProps<{
  text: string
  toolCalls: Map<string, { name: string, result?: string, isError?: boolean }>
}>()

// Debounce MDC rendering to avoid excessive re-renders during fast streaming
const debouncedText = refDebounced(toRef(() => props.text), 150)
</script>

<template>
  <div
    v-if="text || toolCalls.size > 0"
    class="flex justify-start"
  >
    <div class="max-w-[85%] rounded-xl px-4 py-3 bg-elevated/50">
      <!-- Streaming text -->
      <div
        v-if="debouncedText"
        class="prose prose-sm dark:prose-invert max-w-none"
      >
        <MDC :value="debouncedText" />
      </div>

      <!-- Active tool calls -->
      <ChatToolCallBlock
        v-for="[id, tool] in toolCalls"
        :key="id"
        :tool-name="tool.name"
        :result="tool.result"
        :is-error="tool.isError"
        :pending="!tool.result"
      />

      <!-- Streaming indicator -->
      <div class="flex items-center gap-1.5 mt-2">
        <span class="size-2 rounded-full bg-primary animate-pulse" />
        <span class="text-xs text-dimmed">Thinking...</span>
      </div>
    </div>
  </div>
</template>
