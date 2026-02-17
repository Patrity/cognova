<script setup lang="ts">
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

// --- Route ---
const route = useRoute()
const isChatPage = computed(() => route.path === '/chat')

// --- Preferences ---
const {
  assistantPanelOpen,
  assistantPanelTab,
  assistantLastConversationId
} = usePreferences()

const isOpen = ref(assistantPanelOpen.value)
watch(isOpen, (open) => {
  assistantPanelOpen.value = open
})

// --- Tabs ---
const activeTab = ref(assistantPanelTab.value)
watch(activeTab, (tab) => {
  assistantPanelTab.value = tab
})

const tabItems = [
  { label: 'Chat', icon: 'i-lucide-message-square', value: 'chat' },
  { label: 'Terminal', icon: 'i-lucide-terminal', value: 'terminal' }
]

// --- Chat ---
const {
  connectionStatus: chatConnectionStatus,
  sessionStatus,
  activeConversationId,
  messages,
  conversations,
  streamingText,
  streamingToolCalls,
  loading: chatLoading,
  connect: connectChat,
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

function setupChat() {
  connectChat()
  loadConversations()
  if (assistantLastConversationId.value && !activeConversationId.value)
    loadConversation(assistantLastConversationId.value)
}

// --- Terminal ---
const terminalRef = ref<HTMLDivElement | null>(null)
const terminal = ref<Terminal | null>(null)
const fitAddon = ref<FitAddon | null>(null)
const terminalInitialized = ref(false)

const {
  status: terminalStatus,
  connect: connectTerminal,
  disconnect: disconnectTerminal,
  sendInput,
  sendResize,
  startPingInterval,
  stopPingInterval
} = useTerminal()

const terminalStatusIcon = computed(() => {
  switch (terminalStatus.value) {
    case 'connected': return 'i-lucide-wifi'
    case 'connecting': return 'i-lucide-loader-2'
    default: return 'i-lucide-wifi-off'
  }
})

const chatStatusIcon = computed(() => {
  switch (chatConnectionStatus.value) {
    case 'connected': return 'i-lucide-wifi'
    case 'connecting': return 'i-lucide-loader-2'
    default: return 'i-lucide-wifi-off'
  }
})

function statusClasses(status: string) {
  return [
    status === 'connecting' && 'animate-spin',
    status === 'connected' && 'text-success',
    (status === 'error' || status === 'disconnected') && 'text-muted'
  ]
}

function initTerminal() {
  if (!terminalRef.value || terminalInitialized.value) return

  const term = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    theme: {
      background: '#1a1a1a',
      foreground: '#e5e5e5',
      cursor: '#e5e5e5',
      cursorAccent: '#1a1a1a',
      selectionBackground: '#3b3b3b',
      black: '#1a1a1a',
      red: '#ff5555',
      green: '#50fa7b',
      yellow: '#f1fa8c',
      blue: '#6272a4',
      magenta: '#ff79c6',
      cyan: '#8be9fd',
      white: '#e5e5e5',
      brightBlack: '#4d4d4d',
      brightRed: '#ff6e6e',
      brightGreen: '#69ff94',
      brightYellow: '#ffffa5',
      brightBlue: '#d6acff',
      brightMagenta: '#ff92df',
      brightCyan: '#a4ffff',
      brightWhite: '#ffffff'
    }
  })

  const fit = new FitAddon()
  fitAddon.value = fit

  term.loadAddon(fit)
  term.loadAddon(new WebLinksAddon())

  term.open(terminalRef.value)
  fit.fit()

  terminal.value = term
  terminalInitialized.value = true

  term.onData((data) => {
    sendInput(data)
  })
  term.onResize(({ cols, rows }) => {
    sendResize(cols, rows)
  })

  connectTerminal(term)
  startPingInterval()
}

function handleTerminalResize() {
  if (fitAddon.value && terminal.value)
    fitAddon.value.fit()
}

function handleTerminalReconnect() {
  if (terminalStatus.value === 'connecting') return
  if (!terminalInitialized.value) {
    nextTick(initTerminal)
    return
  }
  if (terminal.value)
    connectTerminal(terminal.value)
}

let resizeObserver: ResizeObserver | null = null

function setupTerminal() {
  if (!terminalInitialized.value) {
    initTerminal()
    if (terminalRef.value) {
      resizeObserver = new ResizeObserver(() => handleTerminalResize())
      resizeObserver.observe(terminalRef.value)
    }
  } else {
    handleTerminalResize()
    terminal.value?.focus()
  }
}

// --- Lifecycle ---
watch(isOpen, (open) => {
  if (open) {
    if (activeTab.value === 'chat') setupChat()
    else nextTick(setupTerminal)
  }
})

watch(activeTab, (tab) => {
  if (!isOpen.value) return
  if (tab === 'chat') setupChat()
  else nextTick(setupTerminal)
})

onMounted(() => {
  if (isOpen.value) {
    if (activeTab.value === 'chat') setupChat()
    else nextTick(setupTerminal)
  }
})

onUnmounted(() => {
  stopPingInterval()
  disconnectTerminal()
  if (resizeObserver) resizeObserver.disconnect()
  if (terminal.value) terminal.value.dispose()
})
</script>

<template>
  <div
    v-if="!isChatPage"
    class="fixed bottom-4 right-4 z-50"
  >
    <UButton
      :icon="isOpen ? 'i-lucide-x' : 'i-lucide-message-square'"
      size="lg"
      color="primary"
      class="rounded-full!"
      @click="isOpen = !isOpen"
    />

    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-2 scale-95"
    >
      <div
        v-show="isOpen"
        class="assistant-panel absolute bottom-14 right-0 flex flex-col bg-default border-2 rounded-lg overflow-hidden shadow-lg border-default resize"
      >
        <!-- Header: Tabs + controls -->
        <div class="flex items-center justify-between border-b border-default bg-muted/50">
          <UTabs
            v-model="activeTab"
            :items="tabItems"
            variant="link"
            size="sm"
            :content="false"
            class="flex-1"
          />
          <div class="flex items-center gap-1 px-2">
            <UIcon
              :name="activeTab === 'chat' ? chatStatusIcon : terminalStatusIcon"
              :class="[
                'size-3.5',
                ...statusClasses(activeTab === 'chat' ? chatConnectionStatus : terminalStatus)
              ]"
            />
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              @click="isOpen = false"
            />
          </div>
        </div>

        <!-- Chat tab -->
        <div
          v-show="activeTab === 'chat'"
          class="flex flex-col flex-1 min-h-0"
        >
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
              v-if="chatLoading"
              class="absolute inset-0 flex items-center justify-center bg-elevated/80 z-10"
            >
              <UIcon
                name="i-lucide-loader-2"
                class="size-6 animate-spin text-primary"
              />
            </div>

            <div
              v-if="messages.length === 0 && sessionStatus !== 'streaming' && !chatLoading"
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
            :connection-status="chatConnectionStatus"
            @send="handleSend"
            @interrupt="interrupt"
          />
        </div>

        <!-- Terminal tab -->
        <div
          v-show="activeTab === 'terminal'"
          class="flex flex-col flex-1 min-h-0"
        >
          <div class="flex items-center justify-between px-3 py-1.5 border-b border-default text-sm bg-muted/50">
            <div class="flex items-center gap-2 text-muted text-xs">
              <UIcon
                :name="terminalStatusIcon"
                :class="['size-3.5', ...statusClasses(terminalStatus)]"
              />
              <span>{{ terminalStatus === 'connected' ? 'Connected' : terminalStatus === 'connecting' ? 'Connecting...' : terminalStatus === 'error' ? 'Connection error' : 'Disconnected' }}</span>
            </div>
            <UButton
              v-if="terminalStatus === 'disconnected' || terminalStatus === 'error'"
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-lucide-refresh-cw"
              @click="handleTerminalReconnect"
            >
              Reconnect
            </UButton>
          </div>

          <div
            ref="terminalRef"
            class="flex-1 p-1 bg-[#1a1a1a]"
          />
        </div>
      </div>
    </Transition>
  </div>
</template>

<style>
.assistant-panel {
  width: clamp(360px, 45vw, 800px);
  height: clamp(300px, 65vh, 700px);
  min-width: 360px;
  min-height: 300px;
  max-width: 90vw;
  max-height: 80vh;
}

.xterm {
  height: 100%;
}

.xterm-viewport {
  overflow-y: auto !important;
}

/* Compact prose for chat bubbles */
.chat-prose {
  font-size: 0.8125rem;
  line-height: 1.5;
}

.chat-prose :first-child {
  margin-top: 0;
}

.chat-prose :last-child {
  margin-bottom: 0;
}

.chat-prose p {
  margin-top: 0.375em;
  margin-bottom: 0.375em;
  font-size: 0.9rem;
  line-height: 1.2;
}

.chat-prose h1,
.chat-prose h2,
.chat-prose h3,
.chat-prose h4 {
  margin-top: 0.6em;
  margin-bottom: 0.25em;
  font-size: 1.1rem;
  line-height: 1.4;
}

.chat-prose h1 {
  font-size: 0.9375rem;
}

.chat-prose ul,
.chat-prose ol {
  margin-top: 0.25em;
  margin-bottom: 0.25em;
  padding-left: 1.25em;
}

.chat-prose li {
  margin-top: 0.11em;
  margin-bottom: 0.11em;
}

.chat-prose pre {
  margin-top: 0.375em;
  margin-bottom: 0.375em;
  padding: 0.5em 0.75em;
  font-size: 0.75rem;
  line-height: 1.5;
  border-radius: 0.375rem;
}

.chat-prose code {
  font-size: 0.75rem;
}

.chat-prose blockquote {
  margin-top: 0.375em;
  margin-bottom: 0.375em;
  padding-left: 0.75em;
}

.chat-prose hr {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}

.chat-prose table {
  font-size: 0.75rem;
  margin-top: 0.375em;
  margin-bottom: 0.375em;
}

.chat-prose td {
  padding: 0.4em;
}
</style>
