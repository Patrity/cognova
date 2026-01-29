import { EventEmitter } from 'events'
import type { NotificationPayload } from '~~/shared/types'

type Peer = {
  id: string
  send: (data: string) => void
}

class NotificationBus extends EventEmitter {
  private peers = new Map<string, Peer>()

  registerPeer(peer: Peer) {
    this.peers.set(peer.id, peer)
    console.log(`[notification-bus] Peer connected: ${peer.id} (${this.peers.size} total)`)
  }

  unregisterPeer(peerId: string) {
    this.peers.delete(peerId)
    console.log(`[notification-bus] Peer disconnected: ${peerId} (${this.peers.size} total)`)
  }

  broadcast(payload: NotificationPayload) {
    const message = JSON.stringify({
      ...payload,
      timestamp: payload.timestamp || new Date().toISOString()
    })

    for (const [peerId, peer] of this.peers) {
      try {
        peer.send(message)
      } catch {
        // Peer may have disconnected, remove it
        this.unregisterPeer(peerId)
      }
    }

    console.log(`[notification-bus] Broadcast: ${payload.type} to ${this.peers.size} peers`)
  }

  sendToPeer(peerId: string, payload: NotificationPayload) {
    const peer = this.peers.get(peerId)
    if (peer) {
      try {
        peer.send(JSON.stringify({
          ...payload,
          timestamp: payload.timestamp || new Date().toISOString()
        }))
      } catch {
        this.unregisterPeer(peerId)
      }
    }
  }

  getPeerCount(): number {
    return this.peers.size
  }
}

// Singleton instance
export const notificationBus = new NotificationBus()
