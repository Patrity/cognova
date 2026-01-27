// === Tasks ===

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked'

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: number
  project?: string
  dueDate?: Date
  tags: string[]
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

export interface CreateTaskInput {
  title: string
  description?: string
  project?: string
  dueDate?: string
  priority?: number
  tags?: string[]
}

export interface TaskFilters {
  status?: TaskStatus | TaskStatus[]
  project?: string
  dueBefore?: Date
  dueAfter?: Date
  tags?: string[]
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
