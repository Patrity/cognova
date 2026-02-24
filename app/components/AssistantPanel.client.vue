<script setup lang="ts">
// --- Route ---
const route = useRoute()
const isChatPage = computed(() => route.path === '/chat')

// --- Preferences ---
const {
  assistantPanelOpen,
  assistantPanelTab
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

// --- Status icons (from child refs) ---
const terminalRef = ref<{ status: string } | null>(null)

const { connectionStatus: chatConnectionStatus } = useChat()

const terminalStatus = computed(() => terminalRef.value?.status ?? 'disconnected')

const chatStatusIcon = computed(() => {
  switch (chatConnectionStatus.value) {
    case 'connected': return 'i-lucide-wifi'
    case 'connecting': return 'i-lucide-loader-2'
    default: return 'i-lucide-wifi-off'
  }
})

const terminalStatusIcon = computed(() => {
  switch (terminalStatus.value) {
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
        <AssistantChat
          v-show="activeTab === 'chat'"
          :active="isOpen && activeTab === 'chat'"
        />

        <!-- Terminal tab -->
        <AssistantTerminal
          v-show="activeTab === 'terminal'"
          ref="terminalRef"
          :active="isOpen && activeTab === 'terminal'"
        />
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
