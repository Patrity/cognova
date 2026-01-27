import type { Terminal } from '@xterm/xterm'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

interface TerminalMessage {
  type: 'output' | 'pong' | 'error'
  data?: string
}

export function useTerminal() {
  const status = ref<ConnectionStatus>('disconnected')
  const terminal = ref<Terminal | null>(null)
  const ws = ref<WebSocket | null>(null)
  const reconnectAttempts = ref(0)
  const maxReconnectAttempts = 5
  const reconnectDelay = 2000

  function getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/terminal`
  }

  function connect(term: Terminal) {
    terminal.value = term
    status.value = 'connecting'

    const socket = new WebSocket(getWebSocketUrl())
    ws.value = socket

    socket.onopen = () => {
      status.value = 'connected'
      reconnectAttempts.value = 0

      // Send initial size
      sendResize(term.cols, term.rows)
    }

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as TerminalMessage

        if (msg.type === 'output' && msg.data) {
          term.write(msg.data)
        } else if (msg.type === 'error' && msg.data) {
          status.value = 'error'
          term.write(`\x1b[31m${msg.data}\x1b[0m`)
        }
      } catch {
        // Handle raw data if not JSON
        term.write(event.data)
      }
    }

    socket.onclose = () => {
      status.value = 'disconnected'

      // Attempt reconnection
      if (reconnectAttempts.value < maxReconnectAttempts) {
        reconnectAttempts.value++
        setTimeout(() => {
          if (terminal.value) {
            connect(terminal.value)
          }
        }, reconnectDelay)
      }
    }

    socket.onerror = () => {
      status.value = 'error'
    }
  }

  function disconnect() {
    if (ws.value) {
      ws.value.close()
      ws.value = null
    }
    status.value = 'disconnected'
  }

  function sendInput(data: string) {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify({
        type: 'input',
        data
      }))
    }
  }

  function sendResize(cols: number, rows: number) {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify({
        type: 'resize',
        cols,
        rows
      }))
    }
  }

  function sendPing() {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify({ type: 'ping' }))
    }
  }

  // Keep connection alive
  let pingInterval: ReturnType<typeof setInterval> | null = null

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

  onUnmounted(() => {
    stopPingInterval()
    disconnect()
  })

  return {
    status,
    connect,
    disconnect,
    sendInput,
    sendResize,
    startPingInterval,
    stopPingInterval
  }
}
