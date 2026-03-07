import { mkdir, writeFile, stat } from 'fs/promises'
import { validateKnowledgePath } from '~~/server/utils/knowledge-path'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ path: string, type: 'file' | 'directory' }>(event)
  if (!body?.path)
    throw createError({ statusCode: 400, message: 'Path is required' })

  const targetPath = validateKnowledgePath(body.path)

  const existing = await stat(targetPath).catch(() => null)
  if (existing)
    throw createError({ statusCode: 409, message: 'Already exists' })

  if (body.type === 'directory') {
    await mkdir(targetPath, { recursive: true })
  } else {
    await mkdir(targetPath.substring(0, targetPath.lastIndexOf('/')), { recursive: true })
    await writeFile(targetPath, '', 'utf-8')
  }

  return { data: { path: body.path, type: body.type || 'file' } }
})
