import { eq, and } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'

export default defineNitroPlugin(async () => {
  try {
    const db = getDb()

    const existing = await db.select()
      .from(schema.installedAgents)
      .where(and(
        eq(schema.installedAgents.builtIn, true),
        eq(schema.installedAgents.name, 'Default Assistant')
      ))
      .limit(1)

    if (existing.length > 0)
      return

    await db.insert(schema.installedAgents).values({
      name: 'Default Assistant',
      builtIn: true,
      enabled: true,
      manifestJson: {
        id: 'default',
        name: 'Default Assistant',
        description: 'A general-purpose AI assistant',
        version: '1.0.0',
        model: { tags: ['frontier'] }
      }
    })

    console.log('[seed] Default agent created')
  } catch (error) {
    console.error('[seed] Failed to seed default agent:', error)
  }
})
