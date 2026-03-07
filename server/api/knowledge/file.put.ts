import { writeFile, mkdir } from 'fs/promises'
import { dirname } from 'path'
import { validateKnowledgePath } from '~~/server/utils/knowledge-path'
import { getKnowledgeLoader } from '~~/server/knowledge'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ path: string, content: string }>(event)
  if (!body?.path)
    throw createError({ statusCode: 400, message: 'File path is required' })
  if (typeof body.content !== 'string')
    throw createError({ statusCode: 400, message: 'Content is required' })

  const filePath = validateKnowledgePath(body.path)

  // Ensure parent directory exists
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, body.content, 'utf-8')

  // Invalidate knowledge cache for the agent (first path segment)
  const agentId = body.path.split('/')[0]
  if (agentId)
    getKnowledgeLoader().invalidate(agentId)

  return { data: { path: body.path, saved: true } }
})
