import { pgTable, text, uuid, boolean, timestamp } from 'drizzle-orm/pg-core'
import { user } from './auth'

export const sharedDocuments = pgTable('shared_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  filePath: text('file_path').notNull(),
  title: text('title').notNull(),
  isPublic: boolean('is_public').notNull().default(false),
  publicSlug: text('public_slug').unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})
