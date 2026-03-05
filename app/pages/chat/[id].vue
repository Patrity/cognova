<script setup lang="ts">
import { Chat } from '@ai-sdk/vue'
import { DefaultChatTransport } from 'ai'
import type { Conversation, Message } from '~~/shared/types'
import { dbMessageToUIMessage } from '~~/app/utils/message-converter'

const route = useRoute()
const toast = useToast()
const chatId = route.params.id as string

const refreshConversations = inject<() => Promise<void>>('refreshConversations')

// Load existing conversation data
const { data: chatData } = await useFetch(`/api/conversations/${chatId}`, {
  transform: (res: { data: { conversation: Conversation, messages: Message[] } }) => res.data
})

if (!chatData.value)
  throw createError({ statusCode: 404, statusMessage: 'Chat not found' })

// Convert DB messages to UIMessage format
const initialMessages = chatData.value.messages.map(dbMessageToUIMessage)

// Initialize Chat class
const chat = new Chat({
  id: chatId,
  messages: initialMessages,
  transport: new DefaultChatTransport({
    api: `/api/conversations/${chatId}/chat`
  }),
  onError(error) {
    toast.add({
      title: 'Chat Error',
      description: error.message || 'Failed to get response',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
})

const isStreaming = computed(() => chat.status === 'streaming' || chat.status === 'submitted')
const messagesEndRef = ref<HTMLElement | null>(null)

// Auto-scroll to bottom when messages change
function scrollToBottom() {
  nextTick(() => {
    messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' })
  })
}

watch(() => chat.messages.length, scrollToBottom)
watch(() => chat.status, (newStatus, oldStatus) => {
  scrollToBottom()
  // Refresh sidebar when stream completes (picks up auto-title + timestamp)
  if (oldStatus === 'streaming' && newStatus === 'ready')
    refreshConversations?.()
})

// Handle first message from query param (new chat flow)
const firstMessage = route.query.firstMessage as string | undefined

onMounted(async () => {
  scrollToBottom()
  if (firstMessage) {
    chat.sendMessage({ text: firstMessage })
    await navigateTo(`/chat/${chatId}`, { replace: true })
  }
})

function onSend(text: string) {
  chat.sendMessage({ text })
  refreshConversations?.()
}
</script>

<template>
  <div class="flex flex-col flex-1 min-h-0">
    <!-- Messages area -->
    <div class="flex-1 min-h-0 overflow-y-auto">
      <div class="max-w-3xl mx-auto px-4 py-4 space-y-4">
        <!-- Empty state -->
        <div
          v-if="!chat.messages.length && !isStreaming"
          class="flex items-center justify-center h-full text-sm text-dimmed"
        >
          Send a message to start the conversation
        </div>

        <!-- Message bubbles -->
        <ChatMessageBubble
          v-for="(message, index) in chat.messages"
          :key="message.id"
          :message="message"
          :is-streaming="isStreaming && index === chat.messages.length - 1 && message.role === 'assistant'"
        />

        <!-- Thinking indicator (before first assistant response) -->
        <div
          v-if="chat.status === 'submitted'"
          class="flex justify-start"
        >
          <div class="rounded-xl px-4 py-3 bg-muted">
            <div class="flex items-center gap-1.5">
              <span class="size-2 rounded-full bg-primary animate-pulse" />
              <span class="text-xs text-dimmed">Thinking...</span>
            </div>
          </div>
        </div>

        <div ref="messagesEndRef" />
      </div>
    </div>

    <!-- Input area -->
    <div class="border-t border-default shrink-0">
      <ChatInput
        :streaming="isStreaming"
        @send="onSend"
        @stop="chat.stop()"
      />
    </div>
  </div>
</template>
