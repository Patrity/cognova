import { pgTable, text, uuid, jsonb, boolean, timestamp, unique } from 'drizzle-orm/pg-core'
import { user } from './auth'

export const installedAgents = pgTable('installed_agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  repoUrl: text('repo_url'),
  localPath: text('local_path'),
  manifestJson: jsonb('manifest_json').notNull(),
  configSchemaJson: jsonb('config_schema_json'),
  enabled: boolean('enabled').notNull().default(true),
  builtIn: boolean('built_in').notNull().default(false),
  installedAt: timestamp('installed_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export const agentConfigs = pgTable('agent_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').notNull().references(() => installedAgents.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
  configJson: jsonb('config_json').notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, table => [
  unique('agent_configs_agent_user_unique').on(table.agentId, table.userId)
])
