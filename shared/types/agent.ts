import type { LanguageModel, ToolSet, tool as toolFn } from 'ai'
import type { z as zodInstance } from 'zod'

// The manifest stored in installed_agents.manifestJson
export interface AgentManifest {
  id: string
  name: string
  description?: string
  version?: string
  model?: {
    tags?: string[]
    modelId?: string
  }
  capabilities?: string[]
  knowledge?: string[]
}

// Knowledge loaded from ~/knowledge/[agentId]/
export interface AgentKnowledge {
  files: KnowledgeFile[]
  text: string
}

export interface KnowledgeFile {
  path: string
  name: string
  type: 'json' | 'markdown' | 'text' | 'yaml'
  content: unknown
  raw: string
}

// Utilities passed to external agents to avoid dual-instance module issues
export interface AgentUtils {
  tool: typeof toolFn
  z: typeof zodInstance
}

// Context passed to createAgent()
export interface AgentContext {
  getConfig: () => Promise<Record<string, unknown>>
  knowledge: AgentKnowledge
  getModel: () => Promise<LanguageModel>
  userId: string
  utils: AgentUtils
}

// The object returned by createAgent()
export interface CognovaAgent {
  systemPrompt: string
  tools?: ToolSet
  maxSteps?: number
}

// Agent create function signature
export type CreateAgentFn = (
  config: Record<string, unknown>,
  context: AgentContext
) => CognovaAgent | Promise<CognovaAgent>
