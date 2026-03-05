import type { UIMessage } from 'ai'
import type { Message, MessageMetadata } from '~~/shared/types'

export function dbMessageToUIMessage(msg: Message): UIMessage {
  const content = msg.content as unknown

  // Build metadata with createdAt + any stored stats
  const dbMeta = msg.metadata as MessageMetadata | null
  const metadata: MessageMetadata & { createdAt?: string } = {
    ...dbMeta,
    createdAt: msg.createdAt?.toISOString?.() ?? (msg.createdAt as unknown as string)
  }

  // Content stored as parts array
  if (Array.isArray(content))
    return { id: msg.id, role: msg.role as UIMessage['role'], parts: content, metadata }

  // Content stored as string
  if (typeof content === 'string')
    return { id: msg.id, role: msg.role as UIMessage['role'], parts: [{ type: 'text', text: content }], metadata }

  // Fallback for model message content (assistant messages from AI SDK)
  return {
    id: msg.id,
    role: msg.role as UIMessage['role'],
    parts: [{ type: 'text', text: JSON.stringify(content) }],
    metadata
  }
}
