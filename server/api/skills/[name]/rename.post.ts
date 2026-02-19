import { stat, rename, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { getSkillsDir, getInactiveSkillsDir, isCoreSkill, validateSkillName } from '~~/server/utils/skills-path'

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name')
  if (!name)
    throw createError({ statusCode: 400, message: 'Skill name required' })

  if (isCoreSkill(name))
    throw createError({ statusCode: 403, message: `'${name}' is a core skill and cannot be renamed` })

  const body = await readBody<{ newName: string }>(event)
  if (!body?.newName)
    throw createError({ statusCode: 400, message: 'newName is required' })

  const nameError = validateSkillName(body.newName)
  if (nameError)
    throw createError({ statusCode: 400, message: nameError })

  // Find where the skill currently lives
  const activeDir = join(getSkillsDir(), name)
  const inactiveDir = join(getInactiveSkillsDir(), name)

  let currentDir = ''
  let baseDir = ''

  const activeStat = await stat(activeDir).catch(() => null)
  if (activeStat?.isDirectory()) {
    currentDir = activeDir
    baseDir = getSkillsDir()
  } else {
    const inactiveStat = await stat(inactiveDir).catch(() => null)
    if (inactiveStat?.isDirectory()) {
      currentDir = inactiveDir
      baseDir = getInactiveSkillsDir()
    }
  }

  if (!currentDir)
    throw createError({ statusCode: 404, message: `Skill '${name}' not found` })

  const newDir = join(baseDir, body.newName)
  const newDirStat = await stat(newDir).catch(() => null)
  if (newDirStat)
    throw createError({ statusCode: 409, message: `Skill '${body.newName}' already exists` })

  // Rename directory
  await rename(currentDir, newDir)

  // Update name in SKILL.md frontmatter if it exists
  const skillMdPath = join(newDir, 'SKILL.md')
  const content = await readFile(skillMdPath, 'utf-8').catch(() => '')
  if (content) {
    const updated = content.replace(
      /^(name:\s*).+$/m,
      `$1${body.newName}`
    )
    if (updated !== content)
      await writeFile(skillMdPath, updated, 'utf-8')
  }

  return { data: { name: body.newName } }
})
