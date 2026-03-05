import { getDb, schema } from '~~/server/db'

const ALLOWED_KEYS = ['appName', 'defaultModelId']

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const db = getDb()

  for (const key of ALLOWED_KEYS) {
    if (key in body) {
      await db.insert(schema.appSettings)
        .values({ key, value: body[key] })
        .onConflictDoUpdate({
          target: schema.appSettings.key,
          set: { value: body[key], updatedAt: new Date() }
        })
    }
  }

  return { data: body }
})
