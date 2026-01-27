import { rename, stat } from 'fs/promises'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { oldPath, newPath } = body

  if (!oldPath || !newPath) {
    throw createError({
      statusCode: 400,
      message: 'Both oldPath and newPath are required'
    })
  }

  const absoluteOldPath = validatePath(oldPath)
  const absoluteNewPath = validatePath(newPath)

  // Check if source exists
  try {
    await stat(absoluteOldPath)
  } catch {
    throw createError({
      statusCode: 404,
      message: 'Source path not found'
    })
  }

  // Check if destination already exists
  try {
    await stat(absoluteNewPath)
    throw createError({
      statusCode: 409,
      message: 'Destination path already exists'
    })
  } catch (error: unknown) {
    const err = error as { statusCode?: number }
    if (err.statusCode === 409) throw error
    // ENOENT is expected - destination doesn't exist
  }

  try {
    await rename(absoluteOldPath, absoluteNewPath)

    return {
      data: {
        oldPath,
        newPath
      }
    }
  } catch {
    throw createError({
      statusCode: 500,
      message: 'Failed to rename/move'
    })
  }
})
