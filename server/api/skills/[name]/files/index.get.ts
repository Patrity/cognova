import { stat } from 'fs/promises'
import { join } from 'path'
import { getSkillsDir, getInactiveSkillsDir, buildSkillFileTree } from '~~/server/utils/skills-path'

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name')
  if (!name)
    throw createError({ statusCode: 400, message: 'Skill name required' })

  const skillDir = await findSkillDir(name)
  if (!skillDir)
    throw createError({ statusCode: 404, message: `Skill '${name}' not found` })

  const files = await buildSkillFileTree(skillDir)
  return { data: files }
})

async function findSkillDir(name: string): Promise<string | null> {
  const activeDir = join(getSkillsDir(), name)
  const activeStat = await stat(activeDir).catch(() => null)
  if (activeStat?.isDirectory()) return activeDir

  const inactiveDir = join(getInactiveSkillsDir(), name)
  const inactiveStat = await stat(inactiveDir).catch(() => null)
  if (inactiveStat?.isDirectory()) return inactiveDir

  return null
}
