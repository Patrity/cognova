import { pgTable, text, uuid, jsonb, timestamp } from 'drizzle-orm/pg-core'
import { user } from './auth'
import { installedAgents } from './agents'

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  agentId: uuid('agent_id').references(() => installedAgents.id, { onDelete: 'set null' }),
  title: text('title'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  content: jsonb('content').notNull(),
  toolCallsJson: jsonb('tool_calls_json'),
  createdAt: timestamp('created_at').notNull().defaultNow()
})
