import type { AgentKnowledge } from '~~/shared/types/agent'

export interface IKnowledgeLoader {
  load(agentId: string): Promise<AgentKnowledge>
  invalidate(agentId: string): void
  invalidateAll(): void
}
