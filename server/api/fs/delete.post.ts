import { rm, stat } from 'fs/promises'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const requestedPath = body.path

  if (!requestedPath) {
    throw createError({
      statusCode: 400,
      message: 'Path is required'
    })
  }

  const absolutePath = validatePath(requestedPath)

  // Check if path exists
  try {
    await stat(absolutePath)
  } catch {
    throw createError({
      statusCode: 404,
      message: 'Path not found'
    })
  }

  try {
    await rm(absolutePath, { recursive: true })

    return {
      data: {
        path: requestedPath,
        deleted: true
      }
    }
  } catch {
    throw createError({
      statusCode: 500,
      message: 'Failed to delete'
    })
  }
})
