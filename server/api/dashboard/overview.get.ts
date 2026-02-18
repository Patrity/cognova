import { eq, isNull, and, inArray, gte, desc, sql, ne } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'
import type { DashboardOverview } from '~~/shared/types'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const db = getDb()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [taskCounts, upcomingTasks, recentConversations, recentDocuments, usageAgg] = await Promise.all([
    // Task counts: todo + in_progress (not deleted)
    db.select({
      status: schema.tasks.status,
      count: sql<number>`count(*)::int`
    })
      .from(schema.tasks)
      .where(and(
        isNull(schema.tasks.deletedAt),
        inArray(schema.tasks.status, ['todo', 'in_progress'])
      ))
      .groupBy(schema.tasks.status),

    // Top 5 upcoming tasks (not done, not deleted)
    db.select({
      id: schema.tasks.id,
      title: schema.tasks.title,
      status: schema.tasks.status,
      priority: schema.tasks.priority,
      dueDate: schema.tasks.dueDate,
      projectName: schema.projects.name,
      projectColor: schema.projects.color
    })
      .from(schema.tasks)
      .leftJoin(schema.projects, eq(schema.tasks.projectId, schema.projects.id))
      .where(and(
        isNull(schema.tasks.deletedAt),
        ne(schema.tasks.status, 'done')
      ))
      .orderBy(
        sql`${schema.tasks.dueDate} ASC NULLS LAST`,
        desc(schema.tasks.priority)
      )
      .limit(5),

    // Last 3 conversations
    db.select({
      id: schema.conversations.id,
      sessionId: schema.conversations.sessionId,
      title: schema.conversations.title,
      messageCount: schema.conversations.messageCount,
      startedAt: schema.conversations.startedAt
    })
      .from(schema.conversations)
      .orderBy(desc(schema.conversations.startedAt))
      .limit(3),

    // Last 3 documents (not deleted)
    db.select({
      id: schema.documents.id,
      title: schema.documents.title,
      path: schema.documents.path,
      modifiedAt: schema.documents.modifiedAt,
      projectName: schema.projects.name,
      projectColor: schema.projects.color
    })
      .from(schema.documents)
      .leftJoin(schema.projects, eq(schema.documents.projectId, schema.projects.id))
      .where(isNull(schema.documents.deletedAt))
      .orderBy(desc(schema.documents.modifiedAt))
      .limit(3),

    // 7-day usage summary
    db.select({
      totalCost: sql<number>`coalesce(sum(${schema.tokenUsage.costUsd}), 0)::real`,
      totalCalls: sql<number>`count(*)::int`,
      totalInputTokens: sql<number>`coalesce(sum(${schema.tokenUsage.inputTokens}), 0)::int`,
      totalOutputTokens: sql<number>`coalesce(sum(${schema.tokenUsage.outputTokens}), 0)::int`
    })
      .from(schema.tokenUsage)
      .where(gte(schema.tokenUsage.createdAt, sevenDaysAgo))
  ])

  // Build task counts
  let todoCount = 0
  let inProgressCount = 0
  for (const row of taskCounts) {
    if (row.status === 'todo') todoCount = row.count
    else if (row.status === 'in_progress') inProgressCount = row.count
  }

  const usageRow = usageAgg[0]

  const overview: DashboardOverview = {
    tasks: {
      todoCount,
      inProgressCount,
      upcoming: upcomingTasks.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status as DashboardOverview['tasks']['upcoming'][0]['status'],
        priority: t.priority,
        dueDate: t.dueDate?.toISOString() ?? null,
        projectName: t.projectName ?? null,
        projectColor: t.projectColor ?? null
      }))
    },
    conversations: recentConversations.map(c => ({
      id: c.id,
      sessionId: c.sessionId,
      title: c.title ?? null,
      messageCount: c.messageCount,
      startedAt: c.startedAt.toISOString()
    })),
    documents: recentDocuments.map(d => ({
      id: d.id,
      title: d.title,
      path: d.path,
      modifiedAt: d.modifiedAt?.toISOString() ?? null,
      projectName: d.projectName ?? null,
      projectColor: d.projectColor ?? null
    })),
    usage: {
      totalCost7d: usageRow?.totalCost ?? 0,
      totalCalls7d: usageRow?.totalCalls ?? 0,
      totalInputTokens7d: usageRow?.totalInputTokens ?? 0,
      totalOutputTokens7d: usageRow?.totalOutputTokens ?? 0
    }
  }

  return { data: overview }
})
