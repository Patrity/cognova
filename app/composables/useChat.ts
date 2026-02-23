import type {
  ChatConversation,
  ChatMessage,
  ChatContentBlock,
  ChatImageBlock,
  ChatDocumentBlock,
  ChatServerMessage,
  ChatSessionStatus,
  ChatConnectionStatus
} from '~~/shared/types'

// crypto.randomUUID() requires secure context (HTTPS). Fallback for HTTP.
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID)
    return crypto.randomUUID()
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// Shared state across component instances
const connectionStatus = ref<ChatConnectionStatus>('disconnected')
const sessionStatus = ref<ChatSessionStatus>('idle')
const activeConversationId = ref<string | null>(null)
const messages = ref<ChatMessage[]>([])
const conversations = ref<ChatConversation[]>([])
const streamingText = ref('')
const streamingToolCalls = ref<Record<string, { name: string, result?: string, isError?: boolean }>>({})
const lastCostUsd = ref(0)
const loading = ref(false)

const ws = ref<WebSocket | null>(null)
const reconnectAttempts = ref(0)
const maxReconnectAttempts = 5
let isInitialized = false
let pingInterval: ReturnType<typeof setInterval> | null = null

export function useChat() {
  function getWebSocketUrl(): string {
    if (import.meta.server) return ''
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/_ws/chat`
  }

  function handleServerMessage(msg: ChatServerMessage) {
    switch (msg.type) {
      case 'chat:session_created':
        activeConversationId.value = msg.conversationId
        loadConversations()
        break

      case 'chat:stream_start':
        sessionStatus.value = 'streaming'
        streamingText.value = ''
        streamingToolCalls.value = {}
        break

      case 'chat:text_delta':
        streamingText.value += msg.delta
        break

      case 'chat:tool_start':
        streamingToolCalls.value = { ...streamingToolCalls.value, [msg.toolUseId]: { name: msg.toolName } }
        break

      case 'chat:tool_end': {
        const tool = streamingToolCalls.value[msg.toolUseId]
        if (tool) {
          streamingToolCalls.value = {
            ...streamingToolCalls.value,
            [msg.toolUseId]: { ...tool, result: msg.result, isError: msg.isError }
          }
        }
        break
      }

      case 'chat:stream_end': {
        sessionStatus.value = 'idle'
        lastCostUsd.value = msg.costUsd

        // Finalize streaming into a proper message
        const contentBlocks: ChatContentBlock[] = []
        if (streamingText.value)
          contentBlocks.push({ type: 'text', text: streamingText.value })

        for (const [id, tool] of Object.entries(streamingToolCalls.value)) {
          contentBlocks.push({ type: 'tool_use', id, name: tool.name, input: {} })
          if (tool.result !== undefined)
            contentBlocks.push({ type: 'tool_result', tool_use_id: id, content: tool.result, is_error: tool.isError })
        }

        if (contentBlocks.length > 0) {
          messages.value.push({
            id: generateId(),
            conversationId: msg.conversationId,
            role: 'assistant',
            content: contentBlocks,
            costUsd: msg.costUsd,
            durationMs: msg.durationMs,
            createdAt: new Date()
          })
        }

        streamingText.value = ''
        streamingToolCalls.value = {}

        // Refresh conversations list
        loadConversations()
        break
      }

      case 'chat:error':
        sessionStatus.value = 'error'
        console.error('[chat] Server error:', msg.message)
        break

      case 'chat:interrupted':
        sessionStatus.value = 'interrupted'
        // Save any partial streaming text as a message
        if (streamingText.value) {
          messages.value.push({
            id: generateId(),
            conversationId: msg.conversationId,
            role: 'assistant',
            content: [{ type: 'text', text: streamingText.value }],
            createdAt: new Date()
          })
          streamingText.value = ''
          streamingToolCalls.value = {}
        }
        break
    }
  }

  function connect() {
    if (import.meta.server) return
    if (ws.value?.readyState === WebSocket.OPEN) return
    if (isInitialized && connectionStatus.value === 'connecting') return

    isInitialized = true
    connectionStatus.value = 'connecting'

    const socket = new WebSocket(getWebSocketUrl())
    ws.value = socket

    socket.onopen = () => {
      connectionStatus.value = 'connected'
      reconnectAttempts.value = 0
      startPingInterval()
    }

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as Record<string, unknown>
        if (data.type === 'chat:connected' || data.type === 'pong') return
        handleServerMessage(data as unknown as ChatServerMessage)
      } catch (e) {
        console.error('[chat] Failed to parse message:', e)
      }
    }

    socket.onclose = () => {
      connectionStatus.value = 'disconnected'
      stopPingInterval()

      if (reconnectAttempts.value < maxReconnectAttempts) {
        reconnectAttempts.value++
        setTimeout(connect, 2000 * reconnectAttempts.value)
      }
    }

    socket.onerror = () => {
      connectionStatus.value = 'error'
    }
  }

  function disconnect() {
    stopPingInterval()
    if (ws.value) {
      ws.value.close()
      ws.value = null
    }
    connectionStatus.value = 'disconnected'
    isInitialized = false
  }

  function startPingInterval() {
    if (pingInterval) clearInterval(pingInterval)
    pingInterval = setInterval(() => {
      if (ws.value?.readyState === WebSocket.OPEN)
        ws.value.send(JSON.stringify({ type: 'ping' }))
    }, 30000)
  }

  function stopPingInterval() {
    if (pingInterval) {
      clearInterval(pingInterval)
      pingInterval = null
    }
  }

  function sendMessage(message: string, attachments?: ChatImageBlock[], documents?: ChatDocumentBlock[]) {
    if (!ws.value || ws.value.readyState !== WebSocket.OPEN) return

    // Build content blocks for local display
    const content: ChatContentBlock[] = []
    if (attachments?.length)
      for (const img of attachments) content.push(img)
    if (documents?.length)
      for (const doc of documents) content.push(doc)
    if (message) content.push({ type: 'text', text: message })

    // Add user message locally
    messages.value.push({
      id: generateId(),
      conversationId: activeConversationId.value || '',
      role: 'user',
      content,
      createdAt: new Date()
    })

    ws.value.send(JSON.stringify({
      type: 'chat:send',
      message,
      attachments: attachments?.length ? attachments : undefined,
      documents: documents?.length ? documents : undefined,
      conversationId: activeConversationId.value
    }))
  }

  function interrupt() {
    if (!ws.value || !activeConversationId.value) return
    ws.value.send(JSON.stringify({
      type: 'chat:interrupt',
      conversationId: activeConversationId.value
    }))
  }

  function startNewConversation() {
    activeConversationId.value = null
    messages.value = []
    sessionStatus.value = 'idle'
    streamingText.value = ''
    streamingToolCalls.value = {}
  }

  async function loadConversation(conversationId: string) {
    loading.value = true
    try {
      const response = await $fetch<{ data: ChatConversation & { messages: ChatMessage[] } }>(`/api/conversations/${conversationId}`)
      activeConversationId.value = conversationId
      messages.value = (response.data.messages || []).map(m => ({
        ...m,
        createdAt: new Date(m.createdAt)
      }))
      sessionStatus.value = 'idle'
    } catch (e) {
      console.error('[chat] Failed to load conversation:', e)
    } finally {
      loading.value = false
    }
  }

  async function loadConversations() {
    try {
      const response = await $fetch<{ data: ChatConversation[] }>('/api/conversations')
      conversations.value = response.data
    } catch (e) {
      // Database may be unavailable — fail silently
      console.error('[chat] Failed to load conversations:', e)
    }
  }

  async function deleteConversation(conversationId: string) {
    const conv = conversations.value.find(c => c.id === conversationId)
    if (conv?.isMain) return

    try {
      await $fetch(`/api/conversations/${conversationId}`, { method: 'DELETE' })
      conversations.value = conversations.value.filter(c => c.id !== conversationId)
      if (activeConversationId.value === conversationId)
        startNewConversation()
    } catch (e) {
      console.error('[chat] Failed to delete conversation:', e)
    }
  }

  return {
    // State
    connectionStatus: readonly(connectionStatus),
    sessionStatus: readonly(sessionStatus),
    activeConversationId: readonly(activeConversationId),
    messages,
    conversations,
    streamingText: readonly(streamingText),
    streamingToolCalls: readonly(streamingToolCalls),
    lastCostUsd: readonly(lastCostUsd),
    loading: readonly(loading),

    // Actions
    connect,
    disconnect,
    sendMessage,
    interrupt,
    startNewConversation,
    loadConversation,
    loadConversations,
    deleteConversation
  }
}
