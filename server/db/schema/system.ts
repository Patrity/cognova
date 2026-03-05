import { pgTable, text, uuid, jsonb, integer, real, timestamp, unique } from 'drizzle-orm/pg-core'
import { user } from './auth'
import { providers } from './providers'

export const secrets = pgTable('secrets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  encryptedValue: text('encrypted_value').notNull(),
  iv: text('iv').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
}, table => [
  unique('secrets_user_key_unique').on(table.userId, table.key)
])

export const tokenUsage = pgTable('token_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  providerId: uuid('provider_id').references(() => providers.id, { onDelete: 'set null' }),
  modelId: text('model_id'),
  source: text('source').notNull(),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  cost: real('cost'),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

export const appSettings = pgTable('app_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  value: jsonb('value'),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})
