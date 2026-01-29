// === Users ===

export interface User {
  id: string
  name: string
  email: string
  image?: string
}

// === Projects ===

export interface Project {
  id: string
  name: string
  color: string
  description?: string
  createdAt: Date
  modifiedAt?: Date
  deletedAt?: Date
  createdBy?: string
  modifiedBy?: string
  deletedBy?: string
  creator?: User
}

export interface CreateProjectInput {
  name: string
  color: string
  description?: string
}

export interface UpdateProjectInput {
  name?: string
  color?: string
  description?: string
}

// === Tasks ===

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked'

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: number // 1=Low, 2=Medium, 3=High
  projectId?: string
  project?: Project // Populated on fetch
  dueDate?: Date
  tags: string[]
  createdAt: Date
  modifiedAt?: Date
  completedAt?: Date
  deletedAt?: Date
  createdBy?: string
  modifiedBy?: string
  deletedBy?: string
  creator?: User // Populated on fetch
}

export interface CreateTaskInput {
  title: string
  description?: string
  status?: TaskStatus
  priority?: number // 1-3, defaults to 2
  projectId?: string
  dueDate?: string
  tags?: string[]
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: number
  projectId?: string | null
  dueDate?: string | null
  tags?: string[]
}

export interface TaskFilters {
  status?: TaskStatus | TaskStatus[]
  projectId?: string
  search?: string
  includeDeleted?: boolean
}

// === Reminders ===

export interface Reminder {
  id: string
  taskId?: string
  message: string
  remindAt: Date
  notified: boolean
  createdAt: Date
}

// === Files ===

export interface FileEntry {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  modifiedAt?: Date
  children?: FileEntry[]
}

export interface FileContent {
  path: string
  content: string
  modifiedAt: Date
}

// === Documents ===

export type ShareType = 'public' | 'private'
export type FileType = 'markdown' | 'binary'

export interface Document {
  id: string
  title: string
  path: string
  content?: string
  contentHash?: string
  tags: string[]
  projectId?: string
  project?: Project
  shared: boolean
  shareType?: ShareType
  fileType: FileType
  mimeType?: string
  syncedAt?: Date
  createdAt: Date
  createdBy?: string
  creator?: User
  modifiedAt?: Date
  modifiedBy?: string
  deletedAt?: Date
  deletedBy?: string
}

export interface DocumentMetadata {
  title: string
  tags: string[]
  projectId?: string
  shared: boolean
  shareType?: ShareType
  [key: string]: unknown
}

export interface DocumentWithContent {
  document: Document
  metadata: DocumentMetadata
  body: string
}

export interface UpdateDocumentInput {
  title?: string
  tags?: string[]
  projectId?: string | null
  shared?: boolean
  shareType?: ShareType | null
  body?: string
}

// TOC types for MDC parseMarkdown output
export interface TocLink {
  id: string
  text: string
  depth: number
  children?: TocLink[]
}

// Public document viewer API response
export interface PublicDocumentResponse {
  document: Pick<Document, 'id' | 'title' | 'path' | 'fileType' | 'shared' | 'shareType' | 'tags' | 'createdAt' | 'modifiedAt'> & {
    creatorName: string | null
  }
  content: string | null
  isOwner: boolean
}

// === Conversations ===

export interface Conversation {
  id: string
  startedAt: Date
  endedAt?: Date
  messageCount: number
  summary?: string
}

export interface ConversationDetail extends Conversation {
  messages: ConversationMessage[]
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

// === API ===

export interface ApiResponse<T> {
  data?: T
  error?: string
}

// === Editor ===

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

// === Cron Agents ===

export type AgentStatus = 'success' | 'error' | 'budget_exceeded'
export type RunStatus = 'running' | 'success' | 'error' | 'budget_exceeded'

export interface CronAgent {
  id: string
  name: string
  description?: string
  schedule: string
  prompt: string
  enabled: boolean
  maxTurns?: number
  maxBudgetUsd?: number
  lastRunAt?: Date
  lastStatus?: AgentStatus
  createdAt: Date
  updatedAt: Date
  createdBy?: string
  creator?: User
}

export interface CronAgentRun {
  id: string
  agentId: string
  status: RunStatus
  output?: string
  error?: string
  costUsd?: number
  inputTokens?: number
  outputTokens?: number
  numTurns?: number
  startedAt: Date
  completedAt?: Date
  durationMs?: number
}

export interface CreateAgentInput {
  name: string
  description?: string
  schedule: string
  prompt: string
  enabled?: boolean
  maxTurns?: number
  maxBudgetUsd?: number
}

export interface UpdateAgentInput {
  name?: string
  description?: string
  schedule?: string
  prompt?: string
  enabled?: boolean
  maxTurns?: number
  maxBudgetUsd?: number | null
}
