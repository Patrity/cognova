// === Projects ===

export interface Project {
  id: string
  name: string
  color: string
  description?: string
  createdAt: Date
  modifiedAt?: Date
  deletedAt?: Date
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
