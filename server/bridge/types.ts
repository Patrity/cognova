import type { BridgePlatform, BridgeMessageStatus } from '~~/shared/types'

/**
 * Normalized message format used internally by the bridge router.
 * Adapters convert platform-specific messages to/from this shape.
 */
export interface NormalizedMessage {
  platform: BridgePlatform
  sender: string
  senderName?: string
  text: string
  attachments?: NormalizedAttachment[]
  replyTo?: string
  channelId?: string
  platformMessageId?: string
  raw?: unknown
}

export interface NormalizedAttachment {
  type: 'image' | 'file' | 'audio' | 'video'
  url?: string
  filename?: string
  mimeType?: string
  size?: number
}

export interface DeliveryResult {
  success: boolean
  platformMessageId?: string
  error?: string
}

export interface OutboundMessage {
  bridgeId: string
  platform: BridgePlatform
  recipient: string
  text: string
  attachments?: NormalizedAttachment[]
  replyToMessageId?: string
}

/**
 * Every platform adapter implements this interface.
 * The bridge router doesn't know or care which platform it's talking to.
 */
export interface BridgeAdapter {
  platform: BridgePlatform

  /** Initialize connection/listener. Called when bridge is enabled. */
  start(): Promise<void>

  /** Graceful shutdown. Called when bridge is disabled or server stops. */
  stop(): Promise<void>

  /** Send a message through this platform. */
  send(msg: OutboundMessage): Promise<DeliveryResult>

  /** Check if the adapter connection is healthy. */
  isHealthy(): boolean
}

/**
 * Callback the router gives to adapters so they can push inbound messages.
 */
export type InboundMessageHandler = (
  bridgeId: string,
  message: NormalizedMessage
) => Promise<void>

/**
 * Registry entry for a running adapter.
 */
export interface AdapterEntry {
  bridgeId: string
  adapter: BridgeAdapter
  startedAt: Date
}

/**
 * Bridge message status update for the queue.
 */
export interface MessageStatusUpdate {
  messageId: string
  status: BridgeMessageStatus
  platformMessageId?: string
  error?: string
}
