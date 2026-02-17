<script setup lang="ts">
defineProps<{
  text: string
  toolCalls: Record<string, { name: string, result?: string, isError?: boolean }>
}>()
</script>

<template>
  <div class="flex justify-start">
    <div class="max-w-[85%] rounded-xl px-4 py-3 bg-elevated/50">
      <!-- Streaming text rendered as markdown -->
      <div
        v-if="text"
        class="prose prose-sm dark:prose-invert max-w-none"
      >
        <MDC :value="text" />
      </div>

      <!-- Active tool calls -->
      <ChatToolCallBlock
        v-for="(tool, id) in toolCalls"
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
