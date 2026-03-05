import { getDb, schema } from '~~/server/db'

export default defineEventHandler(async () => {
  const db = getDb()
  const types = await db.select().from(schema.providerTypes)
  return { data: types }
})
