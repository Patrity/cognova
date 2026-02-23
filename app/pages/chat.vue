<script setup lang="ts">
import type { ChatImageBlock } from '~~/shared/types'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const {
  connectionStatus,
  sessionStatus,
  activeConversationId,
  messages,
  conversations,
  streamingText,
  streamingToolCalls,
  connect,
  sendMessage,
  interrupt,
  startNewConversation,
  loadConversation,
  loadConversations,
  deleteConversation
} = useChat()

const route = useRoute()
const router = useRouter()
const messagesContainer = ref<HTMLElement | null>(null)

onMounted(() => {
  connect()
  loadConversations()

  // Load specific conversation from URL param (e.g., from dashboard)
  if (route.query.conversation) {
    const conversationId = route.query.conversation as string
    const stop = watch(connectionStatus, (status) => {
      if (status === 'connected') {
        stop()
        loadConversation(conversationId)
        router.replace({ query: {} })
      }
    }, { immediate: true })
  } else if (route.query.onboarding) {
  // Auto-send greeting when arriving from onboarding modal
    const stop = watch(connectionStatus, (status) => {
      if (status === 'connected') {
        stop()
        startNewConversation()
        sendMessage('Hello!')
        nextTick(scrollToBottom)
        router.replace({ query: {} })
      }
    }, { immediate: true })
  }
})

function handleSend(message: string, attachments?: ChatImageBlock[]) {
  sendMessage(message, attachments)
  nextTick(scrollToBottom)
}

function scrollToBottom() {
  if (messagesContainer.value)
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
}

// Auto-scroll during streaming
watch(streamingText, () => nextTick(scrollToBottom))

const conversationTitle = computed(() => {
  if (!activeConversationId.value) return 'New Chat'
  const conv = conversations.value.find(c => c.id === activeConversationId.value)
  return conv?.title || 'Chat'
})
</script>

<template>
  <div class="flex flex-1 min-w-0">
    <UDashboardPanel
      id="chat-sidebar"
      :default-size="20"
      :min-size="15"
      :max-size="30"
      collapsible
      resizable
      class="hidden lg:flex"
    >
      <ChatConversationList
        :conversations="conversations"
        :active-id="activeConversationId"
        @select="loadConversation"
        @delete="deleteConversation"
        @new="startNewConversation"
      />
    </UDashboardPanel>

    <UDashboardPanel
      id="chat-main"
      grow
    >
      <template #header>
        <UDashboardNavbar :title="conversationTitle">
          <template #right>
            <UBadge
              v-if="sessionStatus === 'streaming'"
              color="warning"
              variant="subtle"
            >
              Streaming
            </UBadge>
            <UButton
              icon="i-lucide-plus"
              variant="ghost"
              color="neutral"
              class="lg:hidden"
              @click="startNewConversation"
            />
          </template>
        </UDashboardNavbar>
      </template>

      <template #default>
        <div class="flex flex-col h-full">
          <!-- Messages area -->
          <div
            ref="messagesContainer"
            class="flex-1 overflow-y-auto p-4 space-y-4"
          >
            <!-- Empty state -->
            <div
              v-if="messages.length === 0 && sessionStatus !== 'streaming'"
              class="flex flex-col items-center justify-center h-full text-dimmed"
            >
              <UIcon
                name="i-lucide-message-square"
                class="size-12 mb-4"
              />
              <p class="text-lg font-medium">
                Start a conversation
              </p>
              <p class="text-sm mt-1">
                Send a message to start chatting with Claude
              </p>
            </div>

            <!-- Message list -->
            <ChatMessageBubble
              v-for="msg in messages"
              :key="msg.id"
              :message="msg"
            />

            <!-- Streaming indicator -->
            <ChatStreamingMessage
              v-if="sessionStatus === 'streaming'"
              :text="streamingText"
              :tool-calls="streamingToolCalls"
            />
          </div>

          <!-- Input -->
          <ChatInput
            :session-status="sessionStatus"
            :connection-status="connectionStatus"
            @send="handleSend"
            @interrupt="interrupt"
          />
        </div>
      </template>
    </UDashboardPanel>
  </div>
</template>
