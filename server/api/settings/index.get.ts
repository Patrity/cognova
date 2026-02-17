import { eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'
import { defaultNotificationPreferences } from '~~/shared/utils/notification-defaults'
import type { UserSettings } from '~~/shared/types'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const userId = event.context.user?.id
  if (!userId)
    throw createError({ statusCode: 401, message: 'Unauthorized' })

  const db = getDb()

  const existing = await db.query.userSettings.findFirst({
    where: eq(schema.userSettings.userId, userId)
  })

  if (!existing)
    return { data: { notifications: defaultNotificationPreferences } as UserSettings }

  const settings = JSON.parse(existing.settings) as Partial<UserSettings>

  // Merge with defaults so new resource types are always present
  return {
    data: {
      notifications: {
        ...defaultNotificationPreferences,
        ...settings.notifications
      }
    } as UserSettings
  }
})
