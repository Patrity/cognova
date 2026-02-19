import { mkdir, writeFile, stat } from 'fs/promises'
import { join, normalize } from 'path'
import { getSkillsDir, getInactiveSkillsDir } from '~~/server/utils/skills-path'

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name')
  if (!name)
    throw createError({ statusCode: 400, message: 'Skill name required' })

  const body = await readBody<{ path: string, type: 'file' | 'directory' }>(event)
  if (!body?.path)
    throw createError({ statusCode: 400, message: 'Path is required' })

  const skillDir = await findSkillDir(name)
  if (!skillDir)
    throw createError({ statusCode: 404, message: `Skill '${name}' not found` })

  const targetPath = normalize(join(skillDir, body.path))
  if (!targetPath.startsWith(skillDir))
    throw createError({ statusCode: 403, message: 'Path traversal not allowed' })

  const existing = await stat(targetPath).catch(() => null)
  if (existing)
    throw createError({ statusCode: 409, message: 'Already exists' })

  if (body.type === 'directory') {
    await mkdir(targetPath, { recursive: true })
  } else {
    await writeFile(targetPath, '', 'utf-8')
  }

  return { data: { path: body.path, type: body.type || 'file' } }
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
