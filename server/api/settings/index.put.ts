import { eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { requireDb } from '~~/server/utils/db-guard'
import type { UserSettings } from '~~/shared/types'

export default defineEventHandler(async (event) => {
  requireDb(event)

  const userId = event.context.user?.id
  if (!userId)
    throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = await readBody<Partial<UserSettings>>(event)
  const db = getDb()

  const existing = await db.query.userSettings.findFirst({
    where: eq(schema.userSettings.userId, userId)
  })

  let currentSettings: Partial<UserSettings> = {}
  if (existing)
    currentSettings = JSON.parse(existing.settings) as Partial<UserSettings>

  const merged: UserSettings = {
    ...currentSettings,
    ...body,
    notifications: body.notifications
      ? { ...currentSettings.notifications, ...body.notifications }
      : currentSettings.notifications ?? {}
  } as UserSettings

  const settingsJson = JSON.stringify(merged)

  if (existing) {
    await db.update(schema.userSettings)
      .set({ settings: settingsJson, updatedAt: new Date() })
      .where(eq(schema.userSettings.userId, userId))
  } else {
    await db.insert(schema.userSettings)
      .values({ userId, settings: settingsJson })
  }

  return { data: merged }
})
