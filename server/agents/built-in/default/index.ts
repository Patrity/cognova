import type { CognovaAgent, AgentContext } from '~~/shared/types/agent'

export function createAgent(
  _config: Record<string, unknown>,
  context: AgentContext
): CognovaAgent {
  const knowledgeSection = context.knowledge.text
    ? `\n\n## Knowledge\n\nThe following knowledge files are available to help you answer questions:\n\n${context.knowledge.text}`
    : ''

  return {
    systemPrompt: `You are a helpful AI assistant powered by Cognova. You provide clear, accurate, and thoughtful responses.

You should:
- Be helpful, harmless, and honest
- Format responses with markdown when appropriate
- Acknowledge when you don't know something
- Be concise but thorough${knowledgeSection}`,
    maxSteps: 3
  }
}
