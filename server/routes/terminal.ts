import {
  getOrCreatePtySession,
  getOutputBuffer,
  resizePty,
  writeToPty,
  destroyPtySession,
  getPtySession
} from '../utils/pty-manager'

interface TerminalMessage {
  type: 'input' | 'resize' | 'ping'
  data?: string
  cols?: number
  rows?: number
}

export default defineWebSocketHandler({
  open(peer) {
    const sessionId = 'default' // For now, single session per app
    const cols = 80
    const rows = 24

    console.log(`Terminal WebSocket opened: ${peer.id}`)

    try {
      const { pty, isNew } = getOrCreatePtySession(sessionId, cols, rows)

      // If reconnecting, replay buffer
      if (!isNew) {
        const buffer = getOutputBuffer(sessionId)
        if (buffer.length > 0) {
          peer.send(JSON.stringify({
            type: 'output',
            data: buffer.join('')
          }))
        }
      }

      // Forward PTY output to client
      const session = getPtySession(sessionId)
      if (session) {
        session.pty.onData((data: string) => {
          try {
            peer.send(JSON.stringify({
              type: 'output',
              data
            }))
          } catch {
            // Client disconnected
          }
        })
      }
    } catch (error) {
      console.error('Failed to create PTY session:', error)
      peer.send(JSON.stringify({
        type: 'error',
        data: `Failed to start terminal: ${error instanceof Error ? error.message : 'Unknown error'}\r\n`
      }))
    }
  },

  message(peer, message) {
    const sessionId = 'default'

    try {
      const msg = JSON.parse(message.text()) as TerminalMessage

      switch (msg.type) {
        case 'input':
          if (msg.data) {
            writeToPty(sessionId, msg.data)
          }
          break

        case 'resize':
          if (msg.cols && msg.rows) {
            resizePty(sessionId, msg.cols, msg.rows)
          }
          break

        case 'ping':
          peer.send(JSON.stringify({ type: 'pong' }))
          break
      }
    } catch (e) {
      console.error('Terminal message error:', e)
    }
  },

  close(peer) {
    console.log(`Terminal WebSocket closed: ${peer.id}`)
    // Don't destroy session on close - allow reconnection
    // Session will be cleaned up by timeout in pty-manager
  },

  error(peer, error) {
    console.error(`Terminal WebSocket error for ${peer.id}:`, error)
  }
})
