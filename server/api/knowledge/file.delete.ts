import { rm, stat } from 'fs/promises'
import { validateKnowledgePath } from '~~/server/utils/knowledge-path'
import { getKnowledgeLoader } from '~~/server/knowledge'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ path: string }>(event)
  if (!body?.path)
    throw createError({ statusCode: 400, message: 'Path is required' })

  const targetPath = validateKnowledgePath(body.path)

  const targetStat = await stat(targetPath).catch(() => null)
  if (!targetStat)
    throw createError({ statusCode: 404, message: 'File not found' })

  await rm(targetPath, { recursive: true })

  // Invalidate knowledge cache for the agent (first path segment)
  const agentId = body.path.split('/')[0]
  if (agentId)
    getKnowledgeLoader().invalidate(agentId)

  return { data: { path: body.path, deleted: true } }
})
