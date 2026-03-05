import { getDb, schema } from '~~/server/db'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const db = getDb()

  const rows = await db.select().from(schema.appSettings)
  const settings: Record<string, unknown> = {}
  for (const row of rows)
    settings[row.key] = row.value

  settings.knowledgePath = config.knowledgePath

  return { data: settings }
})
