import { randomUUID } from 'crypto'
import { query } from '@anthropic-ai/claude-agent-sdk'
import { desc, eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { logTokenUsage } from '~~/server/utils/log-token-usage'
import { sendOutboundMessage } from './router'
import type { NormalizedMessage } from './types'

/**
 * Get or create the Main Chat conversation.
 * There's exactly one conversation with isMain=true.
 */
async function getOrCreateMainChat() {
  const db = getDb()

  const [existing] = await db.select()
    .from(schema.conversations)
    .where(eq(schema.conversations.isMain, true))
    .limit(1)

  if (existing) return existing

  const [created] = await db.insert(schema.conversations)
    .values({
      sessionId: `main-chat-${randomUUID()}`,
      title: 'Main Chat',
      isMain: true,
      status: 'idle',
      messageCount: 0,
      totalCostUsd: 0
    })
    .returning()

  console.log('[bridge] Created Main Chat conversation')
  return created!
}

/**
 * Load memory context directly from DB so the bridge prompt
 * includes user preferences/facts even if the session-start hook
 * can't reach the API (avoids false onboarding).
 */
async function loadMemoryContext(): Promise<string> {
  try {
    const db = getDb()
    const memories = await db.select()
      .from(schema.memoryChunks)
      .orderBy(desc(schema.memoryChunks.relevanceScore), desc(schema.memoryChunks.createdAt))
      .limit(10)

    if (memories.length === 0) return ''

    const lines = ['[Memory context from previous sessions]']
    for (const m of memories)
      lines.push(`- ${m.content}`)
    return lines.join('\n')
  } catch {
    return ''
  }
}

// SDK result shape (same as agent-executor.ts)
interface SDKResult {
  subtype: string
  total_cost_usd: number
  num_turns: number
  duration_ms: number
  result?: string
  errors?: string[]
  session_id?: string
  usage: { input_tokens: number, output_tokens: number }
}

/**
 * Generate a response to a bridge message using the Claude Agent SDK.
 * Routes through the unified Main Chat conversation.
 */
export async function generateBridgeResponse(
  bridgeId: string,
  message: NormalizedMessage,
  bridgeMessageId: string
): Promise<void> {
  const db = getDb()
  const mainChat = await getOrCreateMainChat()

  // Handle bridge commands
  if (message.text.trim() === '/new') {
    await db.update(schema.conversations)
      .set({ sdkSessionId: null, summary: null })
      .where(eq(schema.conversations.id, mainChat.id))

    await sendOutboundMessage({
      bridgeId,
      platform: message.platform,
      recipient: message.channelId || message.sender,
      text: 'Conversation reset. Send me a message to start fresh.'
    })
    return
  }

  // Link inbound bridge message to main chat
  await db.update(schema.bridgeMessages)
    .set({ conversationId: mainChat.id })
    .where(eq(schema.bridgeMessages.id, bridgeMessageId))

  // Persist user message in the conversation
  await db.insert(schema.conversationMessages).values({
    conversationId: mainChat.id,
    role: 'user',
    content: JSON.stringify([{ type: 'text', text: message.text }]),
    source: message.platform
  })

  // Build the prompt — frame as direct conversation, not a notification
  const memoryContext = await loadMemoryContext()
  const parts: string[] = []
  if (memoryContext) parts.push(memoryContext)
  parts.push(`The user is messaging you via ${message.platform}. Respond directly to them. Keep responses concise (suitable for chat/messaging). Do not ask what to reply — you ARE the one replying.`)
  parts.push(message.text)
  const prompt = parts.join('\n\n')

  // Update status
  await db.update(schema.conversations)
    .set({ status: 'streaming' })
    .where(eq(schema.conversations.id, mainChat.id))

  let responseText = ''
  let sdkSessionId: string | undefined
  let costUsd = 0
  let durationMs = 0
  let inputTokens = 0
  let outputTokens = 0
  let numTurns = 0

  try {
    const result = await runQuery(prompt, mainChat.sdkSessionId || undefined)
    responseText = result.text
    sdkSessionId = result.sdkSessionId
    costUsd = result.costUsd
    durationMs = result.durationMs
    inputTokens = result.inputTokens
    outputTokens = result.outputTokens
    numTurns = result.numTurns
  } catch (error) {
    // If resume fails, retry without resume
    if (mainChat.sdkSessionId) {
      console.warn('[bridge] SDK resume failed, retrying fresh:', error instanceof Error ? error.message : error)
      try {
        const result = await runQuery(prompt, undefined)
        responseText = result.text
        sdkSessionId = result.sdkSessionId
        costUsd = result.costUsd
        durationMs = result.durationMs
        inputTokens = result.inputTokens
        outputTokens = result.outputTokens
        numTurns = result.numTurns
      } catch (retryError) {
        console.error('[bridge] SDK query failed:', retryError)
        responseText = 'Sorry, I ran into an issue processing your message. Please try again.'
      }
    } else {
      console.error('[bridge] SDK query failed:', error)
      responseText = 'Sorry, I ran into an issue processing your message. Please try again.'
    }
  }

  if (!responseText)
    responseText = '(No response generated)'

  // Update conversation metadata
  const msgs = await db.select()
    .from(schema.conversationMessages)
    .where(eq(schema.conversationMessages.conversationId, mainChat.id))

  await db.update(schema.conversations)
    .set({
      status: 'idle',
      sdkSessionId: sdkSessionId || mainChat.sdkSessionId,
      messageCount: msgs.length + 1, // +1 for the assistant message we're about to add
      totalCostUsd: (mainChat.totalCostUsd || 0) + costUsd,
      endedAt: new Date()
    })
    .where(eq(schema.conversations.id, mainChat.id))

  // Persist assistant message
  await db.insert(schema.conversationMessages).values({
    conversationId: mainChat.id,
    role: 'assistant',
    content: JSON.stringify([{ type: 'text', text: responseText }]),
    costUsd,
    durationMs
  })

  // Log token usage
  if (costUsd > 0 || inputTokens > 0) {
    logTokenUsage({
      source: 'bridge',
      sourceId: mainChat.id,
      sourceName: `Bridge: ${message.platform}`,
      inputTokens,
      outputTokens,
      costUsd,
      durationMs,
      numTurns
    })
  }

  // Send response back through the bridge adapter
  await sendOutboundMessage({
    bridgeId,
    platform: message.platform,
    recipient: message.channelId || message.sender,
    text: responseText
  })
}

/**
 * Run a Claude Agent SDK query and extract the response.
 */
interface QueryResult {
  text: string
  sdkSessionId?: string
  costUsd: number
  durationMs: number
  inputTokens: number
  outputTokens: number
  numTurns: number
}

async function runQuery(
  prompt: string,
  resumeSessionId?: string
): Promise<QueryResult> {
  const projectDir = process.env.COGNOVA_PROJECT_DIR || process.cwd()

  const conversation = query({
    prompt,
    options: {
      cwd: projectDir,
      settingSources: ['user', 'project'],
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 50,
      ...(resumeSessionId ? { resume: resumeSessionId } : {})
    }
  })

  let text = ''
  let sdkSessionId: string | undefined
  let costUsd = 0
  let durationMs = 0
  let inputTokens = 0
  let outputTokens = 0
  let numTurns = 0

  for await (const message of conversation) {
    if (message.type === 'system' && (message as { subtype?: string }).subtype === 'init') {
      sdkSessionId = (message as { session_id?: string }).session_id
    } else if (message.type === 'result') {
      const msg = message as unknown as SDKResult
      if (msg.subtype === 'success' && msg.result)
        text = msg.result
      else if (msg.errors?.length)
        text = msg.errors.join('\n')

      sdkSessionId = msg.session_id || sdkSessionId
      costUsd = msg.total_cost_usd || 0
      durationMs = msg.duration_ms || 0
      inputTokens = msg.usage?.input_tokens || 0
      outputTokens = msg.usage?.output_tokens || 0
      numTurns = msg.num_turns || 0
    }
  }

  return { text, sdkSessionId, costUsd, durationMs, inputTokens, outputTokens, numTurns }
}
