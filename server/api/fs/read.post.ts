import { readFile, stat } from 'fs/promises'

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

  try {
    const [content, stats] = await Promise.all([
      readFile(absolutePath, 'utf-8'),
      stat(absolutePath)
    ])

    return {
      data: {
        path: requestedPath,
        content,
        modifiedAt: stats.mtime
      }
    }
  } catch (error: unknown) {
    const err = error as NodeJS.ErrnoException
    if (err.code === 'ENOENT') {
      throw createError({
        statusCode: 404,
        message: 'File not found'
      })
    }
    if (err.code === 'EISDIR') {
      throw createError({
        statusCode: 400,
        message: 'Path is a directory, not a file'
      })
    }
    throw createError({
      statusCode: 500,
      message: 'Failed to read file'
    })
  }
})
