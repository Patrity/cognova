import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import type {
  user, session,
  providerTypes, providers, models,
  installedAgents, agentConfigs,
  conversations, messages,
  projects, tasks,
  memoryChunks,
  cronAgents, cronAgentRuns,
  sharedDocuments,
  secrets, tokenUsage, appSettings
} from '~~/server/db/schema'

// Auth
export type User = InferSelectModel<typeof user>
export type Session = InferSelectModel<typeof session>

// Providers
export type ProviderType = InferSelectModel<typeof providerTypes>
export type Provider = InferSelectModel<typeof providers>
export type NewProvider = InferInsertModel<typeof providers>
export type Model = InferSelectModel<typeof models>
export type NewModel = InferInsertModel<typeof models>

// Agents
export type InstalledAgent = InferSelectModel<typeof installedAgents>
export type AgentConfig = InferSelectModel<typeof agentConfigs>
export type NewAgentConfig = InferInsertModel<typeof agentConfigs>

// Conversations
export type Conversation = InferSelectModel<typeof conversations>
export type NewConversation = InferInsertModel<typeof conversations>
export type Message = InferSelectModel<typeof messages>
export type NewMessage = InferInsertModel<typeof messages>

// Tasks
export type Project = InferSelectModel<typeof projects>
export type NewProject = InferInsertModel<typeof projects>
export type Task = InferSelectModel<typeof tasks>
export type NewTask = InferInsertModel<typeof tasks>

// Memory
export type MemoryChunk = InferSelectModel<typeof memoryChunks>
export type NewMemoryChunk = InferInsertModel<typeof memoryChunks>

// Cron
export type CronAgent = InferSelectModel<typeof cronAgents>
export type NewCronAgent = InferInsertModel<typeof cronAgents>
export type CronAgentRun = InferSelectModel<typeof cronAgentRuns>

// Documents
export type SharedDocument = InferSelectModel<typeof sharedDocuments>

// System
export type Secret = InferSelectModel<typeof secrets>
export type TokenUsageRecord = InferSelectModel<typeof tokenUsage>
export type AppSetting = InferSelectModel<typeof appSettings>

// Enums
export const TaskStatus = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
  BLOCKED: 'blocked'
} as const

export const MessageRole = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
  TOOL: 'tool'
} as const

export const MemoryChunkType = {
  DECISION: 'decision',
  FACT: 'fact',
  SOLUTION: 'solution',
  PATTERN: 'pattern',
  PREFERENCE: 'preference',
  SUMMARY: 'summary'
} as const

export const CronRunStatus = {
  RUNNING: 'running',
  SUCCESS: 'success',
  ERROR: 'error',
  BUDGET_EXCEEDED: 'budget_exceeded',
  CANCELLED: 'cancelled'
} as const

export const TokenUsageSource = {
  CHAT: 'chat',
  AGENT: 'agent',
  MEMORY: 'memory',
  CRON: 'cron'
} as const

// API response wrapper
export interface ApiResponse<T> {
  data: T
}
