import { notificationBus } from '../utils/notification-bus'

interface NotificationMessage {
  type: 'ping' | 'subscribe'
}

export default defineWebSocketHandler({
  open(peer) {
    console.log(`Notification WebSocket opened: ${peer.id}`)

    notificationBus.registerPeer({
      id: peer.id,
      send: (data: string) => peer.send(data)
    })

    // Send welcome message
    peer.send(JSON.stringify({
      type: 'connected',
      message: 'Notification bus connected',
      timestamp: new Date().toISOString()
    }))
  },

  message(peer, message) {
    try {
      const msg = JSON.parse(message.text()) as NotificationMessage

      switch (msg.type) {
        case 'ping':
          peer.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }))
          break
      }
    } catch (e) {
      console.error('Notification message error:', e)
    }
  },

  close(peer) {
    console.log(`Notification WebSocket closed: ${peer.id}`)
    notificationBus.unregisterPeer(peer.id)
  },

  error(peer, error) {
    console.error(`Notification WebSocket error for ${peer.id}:`, error)
    notificationBus.unregisterPeer(peer.id)
  }
})
