import { pgTable, text, uuid, boolean, integer, real, timestamp } from 'drizzle-orm/pg-core'
import { user } from './auth'
import { installedAgents } from './agents'

export const cronAgents = pgTable('cron_agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  agentId: uuid('agent_id').notNull().references(() => installedAgents.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  schedule: text('schedule').notNull(),
  prompt: text('prompt').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  maxTurns: integer('max_turns'),
  maxBudget: real('max_budget'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export const cronAgentRuns = pgTable('cron_agent_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  cronAgentId: uuid('cron_agent_id').notNull().references(() => cronAgents.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('running'),
  result: text('result'),
  tokensUsed: integer('tokens_used'),
  cost: real('cost'),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at')
})
