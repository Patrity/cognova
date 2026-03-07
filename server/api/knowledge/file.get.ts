import { readFile, stat } from 'fs/promises'
import { validateKnowledgePath } from '~~/server/utils/knowledge-path'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const path = query.path as string
  if (!path)
    throw createError({ statusCode: 400, message: 'File path is required' })

  const filePath = validateKnowledgePath(path)

  const fileStat = await stat(filePath).catch(() => null)
  if (!fileStat?.isFile())
    throw createError({ statusCode: 404, message: 'File not found' })

  const content = await readFile(filePath, 'utf-8')
  return { data: { path, content } }
})
