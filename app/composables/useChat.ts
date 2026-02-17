import type {
  ChatConversation,
  ChatMessage,
  ChatContentBlock,
  ChatServerMessage,
  ChatSessionStatus
} from '~~/shared/types'

export type ChatConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

// Shared state across component instances
const connectionStatus = ref<ChatConnectionStatus>('disconnected')
const sessionStatus = ref<ChatSessionStatus>('idle')
const activeConversationId = ref<string | null>(null)
const messages = ref<ChatMessage[]>([])
const conversations = ref<ChatConversation[]>([])
const streamingText = ref('')
const streamingToolCalls = ref<Map<string, { name: string, result?: string, isError?: boolean }>>(new Map())
const lastCostUsd = ref(0)

const ws = ref<WebSocket | null>(null)
const reconnectAttempts = ref(0)
const maxReconnectAttempts = 5
let isInitialized = false
let pingInterval: ReturnType<typeof setInterval> | null = null

export function useChat() {
  function getWebSocketUrl(): string {
    if (import.meta.server) return ''
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/chat`
  }

  function handleServerMessage(msg: ChatServerMessage) {
    switch (msg.type) {
      case 'chat:session_created':
        activeConversationId.value = msg.conversationId
        break

      case 'chat:stream_start':
        sessionStatus.value = 'streaming'
        streamingText.value = ''
        streamingToolCalls.value = new Map()
        break

      case 'chat:text_delta':
        streamingText.value += msg.delta
        break

      case 'chat:tool_start':
        streamingToolCalls.value.set(msg.toolUseId, { name: msg.toolName })
        // Trigger reactivity
        streamingToolCalls.value = new Map(streamingToolCalls.value)
        break

      case 'chat:tool_end': {
        const tool = streamingToolCalls.value.get(msg.toolUseId)
        if (tool) {
          tool.result = msg.result
          tool.isError = msg.isError
          streamingToolCalls.value = new Map(streamingToolCalls.value)
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

        for (const [id, tool] of streamingToolCalls.value) {
          contentBlocks.push({ type: 'tool_use', id, name: tool.name, input: {} })
          if (tool.result !== undefined)
            contentBlocks.push({ type: 'tool_result', tool_use_id: id, content: tool.result, is_error: tool.isError })
        }

        if (contentBlocks.length > 0) {
          messages.value.push({
            id: crypto.randomUUID(),
            conversationId: msg.conversationId,
            role: 'assistant',
            content: contentBlocks,
            costUsd: msg.costUsd,
            durationMs: msg.durationMs,
            createdAt: new Date()
          })
        }

        streamingText.value = ''
        streamingToolCalls.value = new Map()

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
            id: crypto.randomUUID(),
            conversationId: msg.conversationId,
            role: 'assistant',
            content: [{ type: 'text', text: streamingText.value }],
            createdAt: new Date()
          })
          streamingText.value = ''
          streamingToolCalls.value = new Map()
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

  function sendMessage(message: string) {
    if (!ws.value || ws.value.readyState !== WebSocket.OPEN) return

    // Add user message locally
    messages.value.push({
      id: crypto.randomUUID(),
      conversationId: activeConversationId.value || '',
      role: 'user',
      content: [{ type: 'text', text: message }],
      createdAt: new Date()
    })

    ws.value.send(JSON.stringify({
      type: 'chat:send',
      message,
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
    streamingToolCalls.value = new Map()
  }

  async function loadConversation(conversationId: string) {
    const response = await $fetch<{ data: ChatConversation & { messages: ChatMessage[] } }>(`/api/conversations/${conversationId}`)
    activeConversationId.value = conversationId
    messages.value = (response.data.messages || []).map(m => ({
      ...m,
      createdAt: new Date(m.createdAt)
    }))
    sessionStatus.value = 'idle'
  }

  async function loadConversations() {
    const response = await $fetch<{ data: ChatConversation[] }>('/api/conversations')
    conversations.value = response.data
  }

  async function deleteConversation(conversationId: string) {
    await $fetch(`/api/conversations/${conversationId}`, { method: 'DELETE' })
    conversations.value = conversations.value.filter(c => c.id !== conversationId)
    if (activeConversationId.value === conversationId)
      startNewConversation()
  }

  return {
    // State
    connectionStatus: readonly(connectionStatus),
    sessionStatus: readonly(sessionStatus),
    activeConversationId: readonly(activeConversationId),
    messages: readonly(messages),
    conversations,
    streamingText: readonly(streamingText),
    streamingToolCalls: readonly(streamingToolCalls),
    lastCostUsd: readonly(lastCostUsd),

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
