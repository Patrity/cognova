import { stat, mkdir, writeFile } from 'fs/promises'
import { join, normalize } from 'path'
import AdmZip from 'adm-zip'
import { getSkillsDir, getInactiveSkillsDir, validateSkillName } from '~~/server/utils/skills-path'

export default defineEventHandler(async (event) => {
  const form = await readMultipartFormData(event)
  if (!form)
    throw createError({ statusCode: 400, message: 'Multipart form data required' })

  const fileField = form.find(f => f.name === 'file')
  if (!fileField?.data)
    throw createError({ statusCode: 400, message: 'No file uploaded' })

  const zip = new AdmZip(Buffer.from(fileField.data))
  const entries = zip.getEntries()

  if (entries.length === 0)
    throw createError({ statusCode: 400, message: 'Zip file is empty' })

  // Determine skill name from root folder or filename
  const firstEntry = entries[0]!.entryName
  const rootFolder = firstEntry.includes('/') ? firstEntry.split('/')[0] : null
  const fileName = fileField.filename?.replace(/\.zip$/i, '') || ''
  const skillName = rootFolder || fileName

  if (!skillName)
    throw createError({ statusCode: 400, message: 'Could not determine skill name from zip' })

  const nameError = validateSkillName(skillName)
  if (nameError)
    throw createError({ statusCode: 400, message: `Invalid skill name: ${nameError}` })

  // Check skill doesn't already exist
  const activeDir = join(getSkillsDir(), skillName)
  const inactiveDir = join(getInactiveSkillsDir(), skillName)

  const activeExists = await stat(activeDir).catch(() => null)
  const inactiveExists = await stat(inactiveDir).catch(() => null)

  if (activeExists || inactiveExists)
    throw createError({ statusCode: 409, message: `Skill '${skillName}' already exists` })

  // Validate zip contains SKILL.md
  const hasSkillMd = entries.some((e) => {
    const parts = e.entryName.split('/')
    // SKILL.md at root or inside one-level folder
    return parts[parts.length - 1] === 'SKILL.md'
      || (parts.length === 2 && parts[1] === 'SKILL.md')
  })
  if (!hasSkillMd)
    throw createError({ statusCode: 400, message: 'Zip must contain a SKILL.md file' })

  // Extract to skills dir with path traversal protection
  const targetDir = activeDir
  await mkdir(targetDir, { recursive: true })

  let fileCount = 0
  for (const entry of entries) {
    if (entry.isDirectory) continue

    // Strip root folder prefix if present
    let relativePath = entry.entryName
    if (rootFolder && relativePath.startsWith(rootFolder + '/'))
      relativePath = relativePath.slice(rootFolder.length + 1)

    if (!relativePath) continue

    // Skip __pycache__ and .pyc files
    if (relativePath.includes('__pycache__') || relativePath.endsWith('.pyc'))
      continue

    // Path traversal check
    const fullPath = normalize(join(targetDir, relativePath))
    if (!fullPath.startsWith(targetDir))
      throw createError({ statusCode: 400, message: 'Path traversal detected in zip entry' })

    // Ensure parent directory exists
    const parentDir = join(fullPath, '..')
    await mkdir(parentDir, { recursive: true })

    await writeFile(fullPath, entry.getData())
    fileCount++
  }

  return { data: { name: skillName, fileCount } }
})
