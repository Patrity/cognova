import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import type { user, session, account, verification, projects, tasks, reminders, conversations } from './schema'

// Auth types
export type DbUser = InferSelectModel<typeof user>
export type DbUserInsert = InferInsertModel<typeof user>

export type DbSession = InferSelectModel<typeof session>
export type DbSessionInsert = InferInsertModel<typeof session>

export type DbAccount = InferSelectModel<typeof account>
export type DbAccountInsert = InferInsertModel<typeof account>

export type DbVerification = InferSelectModel<typeof verification>
export type DbVerificationInsert = InferInsertModel<typeof verification>

// Inferred types from schema
export type DbProject = InferSelectModel<typeof projects>
export type DbProjectInsert = InferInsertModel<typeof projects>

export type DbTask = InferSelectModel<typeof tasks>
export type DbTaskInsert = InferInsertModel<typeof tasks>

export type DbReminder = InferSelectModel<typeof reminders>
export type DbReminderInsert = InferInsertModel<typeof reminders>

export type DbConversation = InferSelectModel<typeof conversations>
export type DbConversationInsert = InferInsertModel<typeof conversations>
