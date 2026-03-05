<script setup lang="ts">
import type { UIMessage } from 'ai'
import type { MessageMetadata } from '~~/shared/types'
import { formatRelativeTime } from '~~/app/utils/formatting'

defineProps<{
  message: UIMessage
  isStreaming?: boolean
}>()

type PartType = UIMessage['parts'][number]

function getTextContent(parts: PartType[]): string {
  return parts
    .filter((p): p is Extract<PartType, { type: 'text' }> => p.type === 'text')
    .map(p => p.text)
    .join('\n')
}

interface ToolPart {
  toolCallId: string
  toolName: string
  state: string
  output?: unknown
  errorText?: string
}

function getToolParts(parts: PartType[]): ToolPart[] {
  return parts
    .filter((p): p is PartType & { type: 'dynamic-tool' } => p.type === 'dynamic-tool')
    .map(p => p as unknown as ToolPart)
}

function getToolResult(tool: ToolPart): string | undefined {
  if (tool.state !== 'output-available' || tool.output === undefined) return undefined
  return typeof tool.output === 'string' ? tool.output : JSON.stringify(tool.output)
}

function getMeta(message: UIMessage): MessageMetadata | null {
  return (message.metadata as MessageMetadata) || null
}

function formatTokPerSec(meta: MessageMetadata): string {
  if (!meta.outputTokens || !meta.durationMs) return '-'
  return (meta.outputTokens / (meta.durationMs / 1000)).toFixed(1)
}

// Copy markdown
const copied = ref(false)

async function copyText(parts: PartType[]) {
  const text = getTextContent(parts)
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    // clipboard API not available
  }
}

// Reactive relative time (updates every 30s)
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 30000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

function relativeTime(meta: MessageMetadata | null): string {
  // Force reactivity on now.value
  void now.value
  return formatRelativeTime(meta?.createdAt)
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
        ? 'bg-primary/5 text-highlighted'
        : 'bg-muted'"
    >
      <!-- User message -->
      <div
        v-if="message.role === 'user'"
        class="text-sm whitespace-pre-wrap"
      >
        {{ getTextContent(message.parts) }}
      </div>

      <!-- Assistant message -->
      <template v-else>
        <!-- Text content rendered as markdown -->
        <div
          v-if="getTextContent(message.parts)"
          class="chat-prose prose prose-sm dark:prose-invert max-w-none"
        >
          <MDC :value="getTextContent(message.parts)" />
        </div>

        <!-- Tool invocations -->
        <ChatToolCallBlock
          v-for="tool in getToolParts(message.parts)"
          :key="tool.toolCallId"
          :tool-name="tool.toolName"
          :result="getToolResult(tool)"
          :is-error="tool.state === 'output-error'"
          :pending="tool.state === 'input-streaming' || tool.state === 'input-available'"
        />

        <!-- Streaming indicator -->
        <div
          v-if="isStreaming"
          class="flex items-center gap-1.5 mt-2"
        >
          <span class="size-2 rounded-full bg-primary animate-pulse" />
          <span class="text-xs text-dimmed">Thinking...</span>
        </div>

        <!-- Actions: relative time (left) | copy + info (right) -->
        <div
          v-if="!isStreaming && getTextContent(message.parts)"
          class="flex items-center gap-3 mt-2 text-xs text-dimmed"
        >
          <!-- Relative time -->
          <span v-if="relativeTime(getMeta(message))">
            {{ relativeTime(getMeta(message)) }}
          </span>

          <div class="ml-auto flex items-center gap-1.5">
            <!-- Copy button -->
            <button
              class="flex items-center gap-1 hover:text-highlighted transition-colors"
              @click="copyText(message.parts)"
            >
              <UIcon
                :name="copied ? 'i-lucide-check' : 'i-lucide-copy'"
                class="size-3"
              />
            </button>

            <!-- Info popover -->
            <UPopover
              v-if="getMeta(message)?.inputTokens"
              mode="hover"
              :open-delay="200"
              :close-delay="100"
            >
              <button class="flex items-center hover:text-highlighted transition-colors">
                <UIcon
                  name="i-lucide-info"
                  class="size-3"
                />
              </button>

              <template #content>
                <div class="p-3 text-xs space-y-1.5 min-w-45">
                  <div
                    v-if="getMeta(message)?.model"
                    class="flex justify-between gap-4"
                  >
                    <span class="text-dimmed">Model</span>
                    <span class="font-medium text-highlighted">{{ getMeta(message)!.model }}</span>
                  </div>
                  <div
                    v-if="getMeta(message)?.inputTokens"
                    class="flex justify-between gap-4"
                  >
                    <span class="text-dimmed">Input</span>
                    <span class="text-highlighted">{{ getMeta(message)!.inputTokens?.toLocaleString() }} tokens</span>
                  </div>
                  <div
                    v-if="getMeta(message)?.outputTokens"
                    class="flex justify-between gap-4"
                  >
                    <span class="text-dimmed">Output</span>
                    <span class="text-highlighted">{{ getMeta(message)!.outputTokens?.toLocaleString() }} tokens</span>
                  </div>
                  <div
                    v-if="getMeta(message)?.durationMs"
                    class="flex justify-between gap-4"
                  >
                    <span class="text-dimmed">Duration</span>
                    <span class="text-highlighted">{{ (getMeta(message)!.durationMs! / 1000).toFixed(1) }}s</span>
                  </div>
                  <div
                    v-if="getMeta(message)?.outputTokens && getMeta(message)?.durationMs"
                    class="flex justify-between gap-4"
                  >
                    <span class="text-dimmed">Speed</span>
                    <span class="text-highlighted">{{ formatTokPerSec(getMeta(message)!) }} tok/s</span>
                  </div>
                  <div
                    v-if="getMeta(message)?.createdAt"
                    class="flex justify-between gap-4 pt-1 border-t border-default"
                  >
                    <span class="text-dimmed">Time</span>
                    <span class="text-highlighted">{{ new Date(getMeta(message)!.createdAt!).toLocaleTimeString() }}</span>
                  </div>
                </div>
              </template>
            </UPopover>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
