import { writeFile, mkdir, stat } from 'fs/promises'
import { join, normalize, dirname } from 'path'
import { getSkillsDir, getInactiveSkillsDir } from '~~/server/utils/skills-path'

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name')
  if (!name)
    throw createError({ statusCode: 400, message: 'Skill name required' })

  const body = await readBody<{ path: string, content: string }>(event)
  if (!body?.path)
    throw createError({ statusCode: 400, message: 'File path is required' })
  if (typeof body.content !== 'string')
    throw createError({ statusCode: 400, message: 'Content is required' })

  const skillDir = await findSkillDir(name)
  if (!skillDir)
    throw createError({ statusCode: 404, message: `Skill '${name}' not found` })

  // Prevent path traversal
  const filePath = normalize(join(skillDir, body.path))
  if (!filePath.startsWith(skillDir))
    throw createError({ statusCode: 403, message: 'Path traversal not allowed' })

  // Ensure parent directory exists
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, body.content, 'utf-8')

  return { data: { path: body.path, saved: true } }
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
