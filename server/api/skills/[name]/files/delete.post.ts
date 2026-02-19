import { rm, stat } from 'fs/promises'
import { join, normalize } from 'path'
import { getSkillsDir, getInactiveSkillsDir } from '~~/server/utils/skills-path'

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name')
  if (!name)
    throw createError({ statusCode: 400, message: 'Skill name required' })

  const body = await readBody<{ path: string }>(event)
  if (!body?.path)
    throw createError({ statusCode: 400, message: 'Path is required' })

  const skillDir = await findSkillDir(name)
  if (!skillDir)
    throw createError({ statusCode: 404, message: `Skill '${name}' not found` })

  const targetPath = normalize(join(skillDir, body.path))
  if (!targetPath.startsWith(skillDir))
    throw createError({ statusCode: 403, message: 'Path traversal not allowed' })

  // Prevent deleting SKILL.md
  if (body.path === 'SKILL.md')
    throw createError({ statusCode: 403, message: 'Cannot delete SKILL.md' })

  const targetStat = await stat(targetPath).catch(() => null)
  if (!targetStat)
    throw createError({ statusCode: 404, message: 'File not found' })

  await rm(targetPath, { recursive: true })

  return { data: { path: body.path, deleted: true } }
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
