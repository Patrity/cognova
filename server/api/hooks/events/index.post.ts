import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'
import { notifyResourceChange } from '~~/server/utils/notify-resource'
import type { CreateHookEventInput } from '~~/shared/types'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const body = await readBody<CreateHookEventInput>(event)

  if (!body.eventType)
    throw createError({ statusCode: 400, message: 'eventType is required' })

  const db = getDb()

  const [hookEvent] = await db
    .insert(schema.hookEvents)
    .values({
      eventType: body.eventType,
      sessionId: body.sessionId || null,
      projectDir: body.projectDir || null,
      toolName: body.toolName || null,
      toolMatcher: body.toolMatcher || null,
      eventData: body.eventData ? JSON.stringify(body.eventData) : null,
      exitCode: body.exitCode ?? null,
      blocked: body.blocked ?? false,
      blockReason: body.blockReason || null,
      durationMs: body.durationMs ?? null,
      hookScript: body.hookScript || null
    })
    .returning()

  if (!hookEvent)
    throw createError({ statusCode: 500, message: 'Failed to create hook event' })

  notifyResourceChange({ resource: 'hook', action: 'create', resourceId: hookEvent!.id, resourceName: body.eventType })

  return { data: hookEvent }
})
