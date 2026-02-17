<script setup lang="ts">
import type { ChatMessage, ChatContentBlock } from '~~/shared/types'

defineProps<{
  message: ChatMessage
}>()

function getTextContent(blocks: ChatContentBlock[]): string {
  return blocks
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n')
}

function getToolPairs(blocks: ChatContentBlock[]) {
  const tools: { name: string, id: string, result?: string, isError?: boolean }[] = []
  for (const block of blocks) {
    if (block.type === 'tool_use')
      tools.push({ name: block.name, id: block.id })
    else if (block.type === 'tool_result') {
      const tool = tools.find(t => t.id === block.tool_use_id)
      if (tool) {
        tool.result = block.content
        tool.isError = block.is_error
      }
    }
  }
  return tools
}
</script>

<template>
  <div
    class="flex"
    :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
  >
    <div
      class="max-w-[85%] rounded-xl px-4 py-3"
      :class="message.role === 'user'
        ? 'bg-primary/10 text-highlighted'
        : 'bg-elevated/50'"
    >
      <!-- User message -->
      <div
        v-if="message.role === 'user'"
        class="text-sm whitespace-pre-wrap"
      >
        {{ getTextContent(message.content) }}
      </div>

      <!-- Assistant message -->
      <template v-else>
        <!-- Text content rendered as markdown -->
        <div
          v-if="getTextContent(message.content)"
          class="prose prose-sm dark:prose-invert max-w-none"
        >
          <MDC :value="getTextContent(message.content)" />
        </div>

        <!-- Tool calls -->
        <ChatToolCallBlock
          v-for="tool in getToolPairs(message.content)"
          :key="tool.id"
          :tool-name="tool.name"
          :result="tool.result"
          :is-error="tool.isError"
        />

        <!-- Cost/duration metadata -->
        <div
          v-if="message.costUsd || message.durationMs"
          class="flex items-center gap-3 mt-2 text-xs text-dimmed"
        >
          <span v-if="message.costUsd">${{ message.costUsd.toFixed(4) }}</span>
          <span v-if="message.durationMs">{{ (message.durationMs / 1000).toFixed(1) }}s</span>
        </div>
      </template>
    </div>
  </div>
</template>
