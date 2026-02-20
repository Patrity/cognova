import { rm, stat } from 'fs/promises'
import { join } from 'path'
import { getSkillsDir, getInactiveSkillsDir, validateSkillName, isCoreSkill } from '~~/server/utils/skills-path'

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name')
  if (!name)
    throw createError({ statusCode: 400, message: 'Skill name required' })

  const nameError = validateSkillName(name)
  if (nameError)
    throw createError({ statusCode: 400, message: nameError })

  if (isCoreSkill(name))
    throw createError({ statusCode: 403, message: 'Core skills cannot be deleted' })

  // Check active first, then inactive
  const activeDir = join(getSkillsDir(), name)
  const inactiveDir = join(getInactiveSkillsDir(), name)

  let skillDir = ''

  const activeStat = await stat(activeDir).catch(() => null)
  if (activeStat?.isDirectory()) {
    skillDir = activeDir
  } else {
    const inactiveStat = await stat(inactiveDir).catch(() => null)
    if (inactiveStat?.isDirectory())
      skillDir = inactiveDir
  }

  if (!skillDir)
    throw createError({ statusCode: 404, message: `Skill '${name}' not found` })

  await rm(skillDir, { recursive: true, force: true })

  return { data: { name, deleted: true } }
})
