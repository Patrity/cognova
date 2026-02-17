<script setup lang="ts">
import type { ChatSessionStatus, ChatConnectionStatus } from '~~/shared/types'

const props = defineProps<{
  sessionStatus: ChatSessionStatus
  connectionStatus: ChatConnectionStatus
}>()

const emit = defineEmits<{
  send: [message: string]
  interrupt: []
}>()

const inputText = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const isStreaming = computed(() => props.sessionStatus === 'streaming')
const isConnected = computed(() => props.connectionStatus === 'connected')
const canSend = computed(() => isConnected.value && !isStreaming.value && inputText.value.trim().length > 0)

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function handleSend() {
  if (!canSend.value) return
  emit('send', inputText.value.trim())
  inputText.value = ''
  nextTick(() => {
    if (textareaRef.value) textareaRef.value.style.height = 'auto'
  })
}

function autoResize(e: Event) {
  const target = e.target as HTMLTextAreaElement
  target.style.height = 'auto'
  target.style.height = Math.min(target.scrollHeight, 200) + 'px'
}
</script>

<template>
  <div class="border-t border-default p-4">
    <!-- Connection status -->
    <div
      v-if="!isConnected"
      class="flex items-center gap-2 mb-2 text-xs text-dimmed"
    >
      <span class="size-2 rounded-full bg-warning" />
      <span>{{ connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected' }}</span>
    </div>

    <div class="flex items-end gap-2">
      <textarea
        ref="textareaRef"
        v-model="inputText"
        :disabled="!isConnected || isStreaming"
        placeholder="Send a message..."
        rows="1"
        class="flex-1 resize-none bg-elevated/50 border border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
        @keydown="handleKeydown"
        @input="autoResize"
      />

      <UButton
        v-if="isStreaming"
        icon="i-lucide-square"
        color="error"
        variant="soft"
        size="md"
        @click="emit('interrupt')"
      />
      <UButton
        v-else
        icon="i-lucide-send"
        color="primary"
        :disabled="!canSend"
        size="md"
        @click="handleSend"
      />
    </div>
  </div>
</template>
