import { stat, mkdir, rename } from 'fs/promises'
import { join } from 'path'
import { getSkillsDir, getInactiveSkillsDir, isCoreSkill } from '~~/server/utils/skills-path'

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name')
  if (!name)
    throw createError({ statusCode: 400, message: 'Skill name required' })

  if (isCoreSkill(name))
    throw createError({ statusCode: 403, message: `'${name}' is a core skill and cannot be disabled` })

  const activeDir = join(getSkillsDir(), name)
  const inactiveDir = join(getInactiveSkillsDir(), name)

  const activeStat = await stat(activeDir).catch(() => null)
  if (activeStat?.isDirectory()) {
    // Move active -> inactive
    await mkdir(getInactiveSkillsDir(), { recursive: true })
    await rename(activeDir, inactiveDir)
    return { data: { name, active: false } }
  }

  const inactiveStat = await stat(inactiveDir).catch(() => null)
  if (inactiveStat?.isDirectory()) {
    // Move inactive -> active
    await rename(inactiveDir, activeDir)
    return { data: { name, active: true } }
  }

  throw createError({ statusCode: 404, message: `Skill '${name}' not found` })
})
