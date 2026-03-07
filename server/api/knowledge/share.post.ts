import { eq, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { basename } from 'path'
import { getDb } from '~~/server/db'
import { sharedDocuments } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const userId = event.context.user.id
  const body = await readBody<{ path: string, enable: boolean }>(event)
  if (!body?.path)
    throw createError({ statusCode: 400, message: 'File path is required' })

  const db = getDb()

  const existing = await db.select()
    .from(sharedDocuments)
    .where(and(
      eq(sharedDocuments.userId, userId),
      eq(sharedDocuments.filePath, body.path)
    ))
    .limit(1)

  const existingDoc = existing[0]

  if (body.enable) {
    if (existingDoc) {
      await db.update(sharedDocuments)
        .set({ isPublic: true, updatedAt: new Date() })
        .where(eq(sharedDocuments.id, existingDoc.id))
      return { data: { isPublic: true, publicSlug: existingDoc.publicSlug } }
    }

    const slug = nanoid(12)
    const title = basename(body.path)
    const [doc] = await db.insert(sharedDocuments)
      .values({
        userId,
        filePath: body.path,
        title,
        isPublic: true,
        publicSlug: slug
      })
      .returning()
    return { data: { isPublic: true, publicSlug: doc!.publicSlug } }
  } else {
    if (existingDoc) {
      await db.update(sharedDocuments)
        .set({ isPublic: false, updatedAt: new Date() })
        .where(eq(sharedDocuments.id, existingDoc.id))
    }
    return { data: { isPublic: false, publicSlug: null } }
  }
})
