import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from 'ai'
import { eq, and } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { loadAgent } from '~~/server/agents/loader'
import { resolveModelForAgent } from '~~/server/agents/resolve-model'
import { logTokenUsage } from '~~/server/ai/usage'
import type { MessageMetadata } from '~~/shared/types'

export default defineEventHandler(async (event) => {
  const userId = event.context.user.id
  const conversationId = getRouterParam(event, 'id')
  if (!conversationId)
    throw createError({ statusCode: 400, message: 'Conversation ID is required' })

  const { messages } = await readBody<{ messages: UIMessage[] }>(event)
  if (!messages?.length)
    throw createError({ statusCode: 400, message: 'Messages are required' })

  const db = getDb()

  // Verify conversation belongs to user
  const [conversation] = await db.select()
    .from(schema.conversations)
    .where(and(
      eq(schema.conversations.id, conversationId),
      eq(schema.conversations.userId, userId)
    ))
    .limit(1)

  if (!conversation)
    throw createError({ statusCode: 404, message: 'Conversation not found' })

  // Load agent
  const agent = await loadAgent(conversation.agentId, userId)

  // Resolve model
  const model = await resolveModelForAgent(conversation.agentId, userId)

  // Save the new user message to DB
  const lastMessage = messages[messages.length - 1]
  if (lastMessage?.role === 'user') {
    await db.insert(schema.messages).values({
      conversationId,
      role: 'user',
      content: lastMessage.parts || [{ type: 'text', text: '' }]
    })
  }

  // Auto-title from first message
  if (!conversation.title && lastMessage?.role === 'user') {
    const textPart = lastMessage.parts?.find(
      (p: { type: string }) => p.type === 'text'
    ) as { type: 'text', text: string } | undefined
    if (textPart?.text) {
      const title = textPart.text.slice(0, 80) + (textPart.text.length > 80 ? '...' : '')
      await db.update(schema.conversations)
        .set({ title, updatedAt: new Date() })
        .where(eq(schema.conversations.id, conversationId))
    }
  }

  // Convert UIMessages to ModelMessages for streamText
  const modelMessages = await convertToModelMessages(messages)

  const modelId = typeof model === 'string' ? model : model.modelId
  const startTime = Date.now()

  // Stream response
  const result = streamText({
    model,
    system: agent.systemPrompt,
    messages: modelMessages,
    tools: agent.tools,
    stopWhen: stepCountIs(agent.maxSteps || 1),
    onFinish: async ({ response, usage }) => {
      const durationMs = Date.now() - startTime
      const metadata: MessageMetadata = {
        model: modelId,
        inputTokens: usage.inputTokens || 0,
        outputTokens: usage.outputTokens || 0,
        durationMs
      }

      // Persist assistant messages (only last gets metadata)
      const assistantMessages = response.messages.filter(msg => msg.role === 'assistant')
      for (let i = 0; i < assistantMessages.length; i++) {
        const msg = assistantMessages[i]!
        await db.insert(schema.messages).values({
          conversationId,
          role: 'assistant',
          content: msg.content,
          metadata: i === assistantMessages.length - 1 ? metadata : undefined
        })
      }

      // Update conversation timestamp
      await db.update(schema.conversations)
        .set({ updatedAt: new Date() })
        .where(eq(schema.conversations.id, conversationId))

      // Log token usage
      logTokenUsage({
        userId,
        modelId,
        source: 'chat',
        inputTokens: usage.inputTokens || 0,
        outputTokens: usage.outputTokens || 0
      })
    }
  })

  return result.toUIMessageStreamResponse({
    messageMetadata({ part }) {
      // Send metadata to client on finish event
      if (part.type === 'finish') {
        return {
          model: modelId,
          inputTokens: part.totalUsage.inputTokens || 0,
          outputTokens: part.totalUsage.outputTokens || 0,
          durationMs: Date.now() - startTime,
          createdAt: new Date().toISOString()
        } satisfies MessageMetadata
      }
      return undefined
    }
  })
})
