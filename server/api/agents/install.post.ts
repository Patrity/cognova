import { installFromLocal } from '~~/server/agents/installer'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ localPath: string }>(event)
  if (!body?.localPath)
    throw createError({ statusCode: 400, message: 'localPath is required' })

  const id = await installFromLocal(body.localPath)
  return { data: { id } }
})
