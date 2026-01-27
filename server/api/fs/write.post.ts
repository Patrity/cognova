import { writeFile, stat, mkdir } from 'fs/promises'
import { dirname } from 'path'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { path: requestedPath, content } = body

  if (!requestedPath) {
    throw createError({
      statusCode: 400,
      message: 'Path is required'
    })
  }

  if (content === undefined) {
    throw createError({
      statusCode: 400,
      message: 'Content is required'
    })
  }

  const absolutePath = validatePath(requestedPath)

  // Check if file exists
  let created = false
  try {
    await stat(absolutePath)
  } catch {
    created = true
  }

  try {
    // Ensure parent directory exists
    await mkdir(dirname(absolutePath), { recursive: true })

    // Write the file
    await writeFile(absolutePath, content, 'utf-8')

    return {
      data: {
        path: requestedPath,
        created
      }
    }
  } catch (error: unknown) {
    throw createError({
      statusCode: 500,
      message: 'Failed to write file'
    })
  }
})
