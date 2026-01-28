import { pgTable, text, uuid, timestamp, integer, boolean } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Projects table
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  color: text('color').notNull(), // Hex color string e.g., "#3b82f6"
  description: text('description'), // Optional markdown
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  modifiedAt: timestamp('modified_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }) // Soft delete
})

// Tasks table
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', {
    enum: ['todo', 'in_progress', 'done', 'blocked']
  }).default('todo').notNull(),
  priority: integer('priority').default(2).notNull(), // 1=Low, 2=Medium, 3=High
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  dueDate: timestamp('due_date', { withTimezone: true }),
  tags: text('tags').array().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  modifiedAt: timestamp('modified_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }) // Soft delete
})

export const reminders = pgTable('reminders', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  message: text('message').notNull(),
  remindAt: timestamp('remind_at', { withTimezone: true }).notNull(),
  notified: boolean('notified').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
})

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: text('session_id').notNull().unique(),
  summary: text('summary'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  messageCount: integer('message_count').default(0).notNull()
})

// Relations for query builder
export const projectsRelations = relations(projects, ({ many }) => ({
  tasks: many(tasks)
}))

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id]
  }),
  reminders: many(reminders)
}))

export const remindersRelations = relations(reminders, ({ one }) => ({
  task: one(tasks, {
    fields: [reminders.taskId],
    references: [tasks.id]
  })
}))
