import { rename, stat } from 'fs/promises'
import { join, basename } from 'path'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { sourcePath, destinationPath } = body

  if (!sourcePath || !destinationPath) {
    throw createError({
      statusCode: 400,
      message: 'sourcePath and destinationPath are required'
    })
  }

  const absoluteSource = validatePath(sourcePath)
  const absoluteDestination = validatePath(destinationPath)

  // Check if source exists
  try {
    await stat(absoluteSource)
  } catch {
    throw createError({
      statusCode: 404,
      message: 'Source path not found'
    })
  }

  // Check if destination is a directory
  let targetPath: string
  try {
    const destStats = await stat(absoluteDestination)
    if (destStats.isDirectory()) {
      // Moving into a directory - append the source filename
      targetPath = join(absoluteDestination, basename(absoluteSource))
    } else {
      throw createError({
        statusCode: 400,
        message: 'Destination must be a directory'
      })
    }
  } catch (error: unknown) {
    const err = error as NodeJS.ErrnoException
    if (err.code === 'ENOENT') {
      throw createError({
        statusCode: 404,
        message: 'Destination directory not found'
      })
    }
    throw error
  }

  try {
    await rename(absoluteSource, targetPath)

    return {
      data: {
        oldPath: sourcePath,
        newPath: toRelativePath(targetPath),
        moved: true
      }
    }
  } catch {
    throw createError({
      statusCode: 500,
      message: 'Failed to move file'
    })
  }
})
