import { pgTable, text, uuid, jsonb, timestamp } from 'drizzle-orm/pg-core'
import { user } from './auth'
import { installedAgents } from './agents'

export const memoryChunks = pgTable('memory_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  agentId: uuid('agent_id').references(() => installedAgents.id, { onDelete: 'set null' }),
  type: text('type').notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})
