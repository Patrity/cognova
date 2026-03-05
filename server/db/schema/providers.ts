import { pgTable, text, uuid, jsonb, timestamp } from 'drizzle-orm/pg-core'
import { user } from './auth'

export const providerTypes = pgTable('provider_types', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  aiSdkPackage: text('ai_sdk_package').notNull(),
  configSchema: jsonb('config_schema'),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

export const providers = pgTable('providers', {
  id: uuid('id').primaryKey().defaultRandom(),
  typeId: text('type_id').notNull().references(() => providerTypes.id),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  configJson: jsonb('config_json'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export const models = pgTable('models', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerId: uuid('provider_id').notNull().references(() => providers.id, { onDelete: 'cascade' }),
  modelId: text('model_id').notNull(),
  displayName: text('display_name').notNull(),
  tags: text('tags').array().default([]),
  createdAt: timestamp('created_at').notNull().defaultNow()
})
