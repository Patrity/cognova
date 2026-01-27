import { mkdir, stat } from 'fs/promises'

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

  // Check if path already exists
  try {
    await stat(absolutePath)
    throw createError({
      statusCode: 409,
      message: 'Path already exists'
    })
  } catch (error: unknown) {
    const err = error as NodeJS.ErrnoException & { statusCode?: number }
    if (err.statusCode === 409) throw error
    // ENOENT is expected - path doesn't exist yet
  }

  try {
    await mkdir(absolutePath, { recursive: true })

    return {
      data: {
        path: requestedPath,
        created: true
      }
    }
  } catch {
    throw createError({
      statusCode: 500,
      message: 'Failed to create directory'
    })
  }
})
