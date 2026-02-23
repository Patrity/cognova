<script setup lang="ts">
const props = defineProps<{
  active: boolean
}>()

const {
  assistantLastConversationId
} = usePreferences()

const {
  connectionStatus,
  sessionStatus,
  activeConversationId,
  messages,
  conversations,
  streamingText,
  streamingToolCalls,
  loading,
  connect,
  sendMessage,
  interrupt,
  startNewConversation,
  loadConversation,
  loadConversations
} = useChat()

const messagesContainer = ref<HTMLElement | null>(null)

const conversationItems = computed(() =>
  conversations.value.map(c => ({
    label: c.title || `Chat ${new Date(c.startedAt).toLocaleDateString()}`,
    value: c.id
  }))
)

const selectedConversationId = ref<string | undefined>(
  assistantLastConversationId.value ?? undefined
)

// Sync selection to preference cookie, only load if user picked a different conversation
watch(selectedConversationId, (id) => {
  assistantLastConversationId.value = id ?? null
  if (id && id !== activeConversationId.value)
    loadConversation(id)
})

// Sync when a new conversation is created via chat:session_created
watch(activeConversationId, (id) => {
  if (id) selectedConversationId.value = id
})

function handleSend(message: string) {
  sendMessage(message)
  nextTick(scrollToBottom)
}

function handleNewChat() {
  startNewConversation()
  selectedConversationId.value = undefined
}

function scrollToBottom() {
  if (messagesContainer.value)
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
}

watch(streamingText, () => nextTick(scrollToBottom))
watch(() => messages.value.length, () => nextTick(scrollToBottom))

function setup() {
  connect()
  loadConversations()
  if (assistantLastConversationId.value && !activeConversationId.value)
    loadConversation(assistantLastConversationId.value)
}

watch(() => props.active, (active) => {
  if (active) setup()
}, { immediate: true })

defineExpose({ connectionStatus })
</script>

<template>
  <div class="flex flex-col flex-1 min-h-0">
    <!-- Conversation selector -->
    <div class="flex items-center gap-2 px-3 py-2 border-b border-default">
      <USelectMenu
        v-model="selectedConversationId"
        :items="conversationItems"
        value-key="value"
        placeholder="New conversation"
        size="xs"
        class="flex-1"
        icon="i-lucide-messages-square"
      />
      <UButton
        icon="i-lucide-plus"
        size="xs"
        color="primary"
        variant="soft"
        @click="handleNewChat"
      />
    </div>

    <!-- Messages -->
    <div
      ref="messagesContainer"
      class="relative flex-1 overflow-y-auto p-3 space-y-3"
    >
      <!-- Loading overlay -->
      <div
        v-if="loading"
        class="absolute inset-0 flex items-center justify-center bg-elevated/80 z-10"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="size-6 animate-spin text-primary"
        />
      </div>

      <div
        v-if="messages.length === 0 && sessionStatus !== 'streaming' && !loading"
        class="flex flex-col items-center justify-center h-full text-dimmed"
      >
        <UIcon
          name="i-lucide-message-square"
          class="size-8 mb-2"
        />
        <p class="text-sm">
          Send a message to start chatting
        </p>
      </div>

      <ChatMessageBubble
        v-for="msg in messages"
        :key="msg.id"
        :message="msg"
      />

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
