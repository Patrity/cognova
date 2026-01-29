import type { NotificationPayload } from '~~/shared/types'

export type NotificationBusStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

// Shared state across all component instances
const status = ref<NotificationBusStatus>('disconnected')
const runningAgentIds = ref<Set<string>>(new Set())
const ws = ref<WebSocket | null>(null)
const reconnectAttempts = ref(0)
const maxReconnectAttempts = 5
const reconnectDelay = 2000
let pingInterval: ReturnType<typeof setInterval> | null = null
let isInitialized = false

export function useNotificationBus() {
  const toast = useToast()

  function getWebSocketUrl(): string {
    if (import.meta.server) return ''
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/notifications`
  }

  function handleNotification(payload: NotificationPayload) {
    // Update running agents state
    if (payload.type === 'agent:started' && payload.agentId) {
      runningAgentIds.value.add(payload.agentId)
    } else if ((payload.type === 'agent:completed' || payload.type === 'agent:failed') && payload.agentId) {
      runningAgentIds.value.delete(payload.agentId)
    }

    // Show toast for agent events
    if (payload.type === 'agent:started') {
      toast.add({
        title: 'Agent Started',
        description: payload.agentName || 'An agent has started running',
        icon: 'i-lucide-play',
        color: 'info'
      })
    } else if (payload.type === 'agent:completed') {
      toast.add({
        title: 'Agent Completed',
        description: payload.agentName || 'Agent run completed successfully',
        icon: 'i-lucide-check-circle',
        color: 'success'
      })
    } else if (payload.type === 'agent:failed') {
      toast.add({
        title: 'Agent Failed',
        description: payload.message || payload.agentName || 'Agent run failed',
        icon: 'i-lucide-alert-circle',
        color: 'error'
      })
    } else if (payload.type === 'toast' && payload.title) {
      toast.add({
        title: payload.title,
        description: payload.message,
        color: payload.color || 'info'
      })
    }
  }

  function connect() {
    if (import.meta.server) return
    if (ws.value?.readyState === WebSocket.OPEN) return
    if (isInitialized && status.value === 'connecting') return

    isInitialized = true
    status.value = 'connecting'

    const socket = new WebSocket(getWebSocketUrl())
    ws.value = socket

    socket.onopen = () => {
      status.value = 'connected'
      reconnectAttempts.value = 0
      console.log('[notification-bus] Connected')
      startPingInterval()
    }

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as Record<string, unknown>
        const msgType = data.type as string

        // Skip pong and connected messages
        if (msgType === 'pong' || msgType === 'connected') return

        // Only handle known notification types
        if (msgType === 'agent:started' || msgType === 'agent:completed' || msgType === 'agent:failed' || msgType === 'toast') {
          handleNotification(data as unknown as NotificationPayload)
        }
      } catch (e) {
        console.error('[notification-bus] Failed to parse message:', e)
      }
    }

    socket.onclose = () => {
      status.value = 'disconnected'
      stopPingInterval()

      // Attempt reconnection
      if (reconnectAttempts.value < maxReconnectAttempts) {
        reconnectAttempts.value++
        console.log(`[notification-bus] Reconnecting (attempt ${reconnectAttempts.value})...`)
        setTimeout(connect, reconnectDelay * reconnectAttempts.value)
      }
    }

    socket.onerror = () => {
      status.value = 'error'
    }
  }

  function disconnect() {
    stopPingInterval()
    if (ws.value) {
      ws.value.close()
      ws.value = null
    }
    status.value = 'disconnected'
    isInitialized = false
  }

  function sendPing() {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify({ type: 'ping' }))
    }
  }

  function startPingInterval() {
    if (pingInterval) clearInterval(pingInterval)
    pingInterval = setInterval(sendPing, 30000)
  }

  function stopPingInterval() {
    if (pingInterval) {
      clearInterval(pingInterval)
      pingInterval = null
    }
  }

  function isAgentRunning(agentId: string): boolean {
    return runningAgentIds.value.has(agentId)
  }

  return {
    status: readonly(status),
    runningAgentIds: readonly(runningAgentIds),
    isAgentRunning,
    connect,
    disconnect
  }
}
