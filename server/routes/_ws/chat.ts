import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import { chatSessionManager } from '~~/server/utils/chat-session-manager'
import { getDb } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { logTokenUsage } from '~~/server/utils/log-token-usage'
import type { ChatClientMessage, ChatContentBlock, ChatImageBlock } from '~~/shared/types'
import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages/messages'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function send(peer: any, data: object) {
  try {
    const json = JSON.stringify(data)
    peer.send(json)
  } catch (err) {
    console.error('[chat] send failed:', err)
  }
}

function buildSdkContent(message: string, attachments?: ChatImageBlock[]): string | ContentBlockParam[] {
  if (!attachments?.length) return message

  const blocks: ContentBlockParam[] = []
  for (const img of attachments) {
    blocks.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: img.source.media_type,
        data: img.source.data
      }
    })
  }
  if (message) blocks.push({ type: 'text', text: message })
  return blocks
}

export default defineWebSocketHandler({
  open(peer) {
    console.log(`[chat] WebSocket opened: ${peer.id}`)
    send(peer, { type: 'chat:connected' })
  },

  message(peer, rawMessage) {
    try {
      const msg = JSON.parse(rawMessage.text()) as ChatClientMessage

      switch (msg.type) {
        case 'chat:send':
          handleSend(peer, msg.message, msg.conversationId, msg.attachments)
          break
        case 'chat:interrupt':
          handleInterrupt(peer, msg.conversationId)
          break
      }
    } catch (e) {
      console.error('[chat] Message error:', e)
      send(peer, { type: 'chat:error', message: 'Invalid message format' })
    }
  },

  close(peer) {
    console.log(`[chat] WebSocket closed: ${peer.id}`)
  },

  error(peer, error) {
    console.error(`[chat] WebSocket error for ${peer.id}:`, error)
  }
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSend(peer: any, message: string, conversationId?: string, attachments?: ChatImageBlock[]) {
  const db = getDb()

  let convId = conversationId
  let resumeSessionId: string | undefined

  if (!convId) {
    // New conversation
    const [conv] = await db.insert(schema.conversations)
      .values({
        sessionId: randomUUID(),
        title: message.slice(0, 100) || 'Image message',
        status: 'streaming',
        messageCount: 0,
        totalCostUsd: 0
      })
      .returning()

    convId = conv!.id
    send(peer, { type: 'chat:session_created', conversationId: convId })
  } else {
    // Continuing existing conversation — check for SDK session to resume
    const existing = chatSessionManager.getSession(convId)
    if (existing) resumeSessionId = existing.sdkSessionId

    if (!resumeSessionId) {
      const [conv] = await db.select()
        .from(schema.conversations)
        .where(eq(schema.conversations.id, convId))
        .limit(1)

      if (!conv) {
        send(peer, { type: 'chat:error', message: 'Conversation not found' })
        return
      }
      if (conv.sdkSessionId) resumeSessionId = conv.sdkSessionId
    }

    await db.update(schema.conversations)
      .set({ status: 'streaming' })
      .where(eq(schema.conversations.id, convId))
  }

  // Build content blocks for persistence
  const userContent: ChatContentBlock[] = []
  if (attachments?.length)
    for (const img of attachments) userContent.push(img)
  if (message) userContent.push({ type: 'text', text: message })

  // Persist user message
  await db.insert(schema.conversationMessages).values({
    conversationId: convId,
    role: 'user',
    content: JSON.stringify(userContent),
    source: 'web'
  })

  // Build prompt for SDK (string for text-only, ContentBlockParam[] for multimodal)
  const prompt = buildSdkContent(message, attachments)

  // Start SDK streaming (fire-and-forget so WS stays responsive for interrupts)
  const session = chatSessionManager.startSession(convId, prompt, resumeSessionId)
  send(peer, { type: 'chat:stream_start', conversationId: convId })

  streamSDKResponse(peer, session, convId).catch((err) => {
    console.error('[chat] Unhandled stream error:', err)
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleInterrupt(peer: any, conversationId: string) {
  const interrupted = chatSessionManager.interrupt(conversationId)
  if (!interrupted)
    send(peer, { type: 'chat:error', conversationId, message: 'No active session to interrupt' })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function streamSDKResponse(peer: any, session: any, conversationId: string) {
  const db = getDb()
  const contentBlocks: ChatContentBlock[] = []
  let currentText = ''

  try {
    for await (const message of session.conversation) {
      if (session.interrupted) {
        send(peer, { type: 'chat:interrupted', conversationId })
        await db.update(schema.conversations)
          .set({ status: 'interrupted' })
          .where(eq(schema.conversations.id, conversationId))
        break
      }

      if (message.type === 'system' && message.subtype === 'init') {
        session.sdkSessionId = message.session_id
        await db.update(schema.conversations)
          .set({ sdkSessionId: message.session_id })
          .where(eq(schema.conversations.id, conversationId))
      } else if (message.type === 'stream_event') {
        // Real-time streaming events from the Anthropic API
        const event = message.event
        if (event.type === 'content_block_delta') {
          const deltaType = event.delta?.type
          if (deltaType === 'text_delta' && event.delta.text) {
            currentText += event.delta.text
            send(peer, { type: 'chat:text_delta', conversationId, delta: event.delta.text })
          }
        } else if (event.type === 'content_block_start') {
          if (event.content_block?.type === 'tool_use') {
            send(peer, {
              type: 'chat:tool_start',
              conversationId,
              toolUseId: event.content_block.id,
              toolName: event.content_block.name
            })
          }
        }
      } else if (message.type === 'assistant') {
        // Complete assistant turn — capture content blocks for persistence
        for (const block of message.message?.content || []) {
          if (block.type === 'text') {
            contentBlocks.push({ type: 'text', text: block.text })
            // Fallback: if no stream_events arrived, send full text now
            if (!currentText)
              send(peer, { type: 'chat:text_delta', conversationId, delta: block.text })
          } else if (block.type === 'tool_use') {
            contentBlocks.push({
              type: 'tool_use',
              id: block.id,
              name: block.name,
              input: block.input as Record<string, unknown>
            })
          }
        }
        currentText = ''
      } else if (message.type === 'user') {
        // User messages contain tool results from SDK tool execution
        const content = message.message?.content
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === 'tool_result') {
              const resultText = typeof block.content === 'string'
                ? block.content
                : Array.isArray(block.content)
                  ? block.content.map((c: { text?: string }) => c.text || '').join('')
                  : JSON.stringify(block.content ?? '')
              contentBlocks.push({
                type: 'tool_result',
                tool_use_id: block.tool_use_id,
                content: resultText,
                is_error: !!block.is_error
              })
              send(peer, {
                type: 'chat:tool_end',
                conversationId,
                toolUseId: block.tool_use_id,
                result: resultText.slice(0, 5000),
                isError: !!block.is_error
              })
            }
          }
        }
      } else if (message.type === 'result') {
        // Cast to access usage fields the SDK provides but aren't in the TS types
        const msg = message as unknown as {
          total_cost_usd: number
          duration_ms: number
          num_turns: number
          usage: { input_tokens: number, output_tokens: number }
        }
        const costUsd = msg.total_cost_usd || 0
        const durationMs = msg.duration_ms || 0
        const inputTokens = msg.usage?.input_tokens || 0
        const outputTokens = msg.usage?.output_tokens || 0

        // Persist assistant message
        if (contentBlocks.length > 0) {
          await db.insert(schema.conversationMessages).values({
            conversationId,
            role: 'assistant',
            content: JSON.stringify(contentBlocks),
            costUsd,
            durationMs
          })
        }

        // Count messages
        const msgs = await db.select()
          .from(schema.conversationMessages)
          .where(eq(schema.conversationMessages.conversationId, conversationId))

        // Update conversation metadata
        await db.update(schema.conversations)
          .set({
            status: 'idle',
            messageCount: msgs.length,
            totalCostUsd: costUsd,
            endedAt: new Date()
          })
          .where(eq(schema.conversations.id, conversationId))

        // Log token usage
        const [conv] = await db.select({ title: schema.conversations.title })
          .from(schema.conversations)
          .where(eq(schema.conversations.id, conversationId))
          .limit(1)

        logTokenUsage({
          source: 'chat',
          sourceId: conversationId,
          sourceName: conv?.title || 'Chat',
          inputTokens,
          outputTokens,
          costUsd,
          durationMs,
          numTurns: msg.num_turns || 1
        })

        send(peer, {
          type: 'chat:stream_end',
          conversationId,
          costUsd,
          durationMs
        })
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[chat] Stream error:', errorMsg)
    send(peer, { type: 'chat:error', conversationId, message: errorMsg })

    await db.update(schema.conversations)
      .set({ status: 'error' })
      .where(eq(schema.conversations.id, conversationId))
  } finally {
    chatSessionManager.removeSession(conversationId)
  }
}
