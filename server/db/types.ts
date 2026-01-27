import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import type { tasks, reminders, conversations } from './schema'

// Inferred types from schema
export type DbTask = InferSelectModel<typeof tasks>
export type DbTaskInsert = InferInsertModel<typeof tasks>

export type DbReminder = InferSelectModel<typeof reminders>
export type DbReminderInsert = InferInsertModel<typeof reminders>

export type DbConversation = InferSelectModel<typeof conversations>
export type DbConversationInsert = InferInsertModel<typeof conversations>
