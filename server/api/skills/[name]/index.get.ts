import { readFile, stat } from 'fs/promises'
import { join } from 'path'
import { getSkillsDir, getInactiveSkillsDir, parseSkillFrontmatter, buildSkillFileTree, isCoreSkill } from '~~/server/utils/skills-path'
import type { SkillDetail } from '~~/shared/types'

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name')
  if (!name)
    throw createError({ statusCode: 400, message: 'Skill name required' })

  // Check active first, then inactive
  const activeDir = join(getSkillsDir(), name)
  const inactiveDir = join(getInactiveSkillsDir(), name)

  let skillDir = ''
  let active = false

  const activeStat = await stat(activeDir).catch(() => null)
  if (activeStat?.isDirectory()) {
    skillDir = activeDir
    active = true
  } else {
    const inactiveStat = await stat(inactiveDir).catch(() => null)
    if (inactiveStat?.isDirectory()) {
      skillDir = inactiveDir
      active = false
    }
  }

  if (!skillDir)
    throw createError({ statusCode: 404, message: `Skill '${name}' not found` })

  const skillMdPath = join(skillDir, 'SKILL.md')
  const content = await readFile(skillMdPath, 'utf-8').catch(() => '')
  const meta = parseSkillFrontmatter(content)
  const files = await buildSkillFileTree(skillDir)

  const detail: SkillDetail = {
    name: meta.name || name,
    description: meta.description || '',
    version: meta.version || '',
    author: meta.author || '',
    active,
    core: isCoreSkill(name),
    allowedTools: meta.allowedTools,
    requiresSecrets: meta.requiresSecrets,
    installedFrom: meta.installedFrom || '',
    fileCount: files.filter(f => f.type === 'file').length,
    meta,
    files
  }

  return { data: detail }
})
