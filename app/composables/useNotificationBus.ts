import type { NotificationPayload, NotificationPreferences, NotificationAction } from '~~/shared/types'
import { defaultNotificationPreferences } from '~~/shared/utils/notification-defaults'

export type NotificationBusStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

// Shared state across all component instances
const status = ref<NotificationBusStatus>('disconnected')
const runningAgentIds = ref<Set<string>>(new Set())
const notificationPreferences = ref<NotificationPreferences>({ ...defaultNotificationPreferences })
const ws = ref<WebSocket | null>(null)
const reconnectAttempts = ref(0)
const maxReconnectAttempts = 5
const reconnectDelay = 2000
let pingInterval: ReturnType<typeof setInterval> | null = null
let isInitialized = false
let preferencesLoaded = false

const actionIcons: Record<NotificationAction, string> = {
  create: 'i-lucide-plus-circle',
  edit: 'i-lucide-pencil',
  delete: 'i-lucide-trash-2',
  restore: 'i-lucide-undo-2',
  run: 'i-lucide-play',
  cancel: 'i-lucide-x-circle',
  complete: 'i-lucide-check-circle',
  fail: 'i-lucide-alert-circle'
}

export function useNotificationBus() {
  const toast = useToast()

  function getWebSocketUrl(): string {
    if (import.meta.server) return ''
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/notifications`
  }

  async function loadPreferences() {
    if (preferencesLoaded) return
    try {
      const response = await $fetch<{ data: { notifications: NotificationPreferences } }>('/api/settings')
      notificationPreferences.value = { ...defaultNotificationPreferences, ...response.data.notifications }
      preferencesLoaded = true
    } catch {
      console.warn('[notification-bus] Failed to load preferences, using defaults')
    }
  }

  function handleNotification(payload: NotificationPayload) {
    // Always track running agents regardless of preferences
    if (payload.resource === 'agent' && payload.resourceId) {
      if (payload.action === 'run')
        runningAgentIds.value.add(payload.resourceId)
      else if (payload.action === 'complete' || payload.action === 'fail' || payload.action === 'cancel')
        runningAgentIds.value.delete(payload.resourceId)
    }

    // Check resource-level preference
    const pref = notificationPreferences.value[payload.resource]
    if (!pref?.enabled) return

    // Check subtype preference (defaults to enabled if not explicitly set)
    if (pref.subtypes && pref.subtypes[payload.action] === false) return

    toast.add({
      title: payload.title || 'Notification',
      description: payload.message,
      icon: actionIcons[payload.action] || 'i-lucide-bell',
      color: payload.color || 'info'
    })
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
      loadPreferences()
      startPingInterval()
    }

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as Record<string, unknown>
        const msgType = data.type as string

        // Skip control messages
        if (msgType === 'pong' || msgType === 'connected') return

        // Handle resource change notifications
        if (msgType === 'resource_change')
          handleNotification(data as unknown as NotificationPayload)
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
    if (ws.value?.readyState === WebSocket.OPEN)
      ws.value.send(JSON.stringify({ type: 'ping' }))
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

  function updatePreferences(prefs: NotificationPreferences) {
    notificationPreferences.value = prefs
  }

  return {
    status: readonly(status),
    runningAgentIds: readonly(runningAgentIds),
    notificationPreferences: readonly(notificationPreferences),
    isAgentRunning,
    connect,
    disconnect,
    loadPreferences,
    updatePreferences
  }
}
