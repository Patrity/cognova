import {
  getOrCreatePtySession,
  getOutputBuffer,
  resizePty,
  writeToPty,
  getPtySession
} from '~~/server/utils/pty-manager'
import { auth } from '~~/server/utils/auth'

interface TerminalMessage {
  type: 'input' | 'resize' | 'ping'
  data?: string
  cols?: number
  rows?: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function send(peer: any, data: object) {
  try {
    peer.send(JSON.stringify(data))
  } catch {
    // Client disconnected
  }
}

export default defineWebSocketHandler({
  async open(peer) {
    // Validate auth from upgrade request cookies (middleware is bypassed for /_ws)
    const headers = peer.request?.headers
    if (headers) {
      try {
        const session = await auth.api.getSession({ headers })
        if (!session) {
          send(peer, { type: 'error', data: 'Unauthorized\r\n' })
          peer.close(1008, 'Unauthorized')
          return
        }
      } catch (e) {
        console.error('[terminal] Auth check failed:', e)
        send(peer, { type: 'error', data: 'Authentication failed\r\n' })
        peer.close(1008, 'Authentication failed')
        return
      }
    }

    const sessionId = 'default'
    const cols = 80
    const rows = 24

    console.log(`[terminal] WebSocket opened: ${peer.id}`)

    try {
      const { isNew } = getOrCreatePtySession(sessionId, cols, rows)

      // If reconnecting, replay buffer
      if (!isNew) {
        const buffer = getOutputBuffer(sessionId)
        if (buffer.length > 0) {
          send(peer, { type: 'output', data: buffer.join('') })
        }
      }

      // Forward PTY output to client
      const session = getPtySession(sessionId)
      if (session) {
        session.pty.onData((data: string) => {
          send(peer, { type: 'output', data })
        })
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      const stack = error instanceof Error ? error.stack : ''
      console.error('[terminal] Failed to create PTY session:', msg, stack)
      send(peer, { type: 'error', data: `Failed to start terminal: ${msg}\r\n` })
    }
  },

  message(peer, message) {
    const sessionId = 'default'

    try {
      const msg = JSON.parse(message.text()) as TerminalMessage

      switch (msg.type) {
        case 'input':
          if (msg.data)
            writeToPty(sessionId, msg.data)
          break

        case 'resize':
          if (msg.cols && msg.rows)
            resizePty(sessionId, msg.cols, msg.rows)
          break

        case 'ping':
          send(peer, { type: 'pong' })
          break
      }
    } catch (e) {
      console.error('[terminal] Message error:', e)
    }
  },

  close(peer) {
    console.log(`[terminal] WebSocket closed: ${peer.id}`)
  },

  error(peer, error) {
    console.error(`[terminal] WebSocket error for ${peer.id}:`, error)
  }
})
