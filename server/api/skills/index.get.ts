import { readdir, readFile, stat } from 'fs/promises'
import { join } from 'path'
import { getSkillsDir, getInactiveSkillsDir, parseSkillFrontmatter, isCoreSkill } from '~~/server/utils/skills-path'
import type { SkillListItem } from '~~/shared/types'

export default defineEventHandler(async () => {
  const skills: SkillListItem[] = []

  // Scan active skills
  await scanDir(getSkillsDir(), true, skills)

  // Scan inactive skills
  await scanDir(getInactiveSkillsDir(), false, skills)

  // Sort: core first, then alphabetical
  skills.sort((a, b) => {
    if (a.core !== b.core) return a.core ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return { data: skills }
})

async function scanDir(dir: string, active: boolean, skills: SkillListItem[]): Promise<void> {
  const entries = await readdir(dir).catch(() => [])

  for (const entry of entries) {
    // Skip _lib and hidden dirs
    if (entry.startsWith('_') || entry.startsWith('.'))
      continue

    const skillDir = join(dir, entry)
    const stats = await stat(skillDir).catch(() => null)
    if (!stats?.isDirectory()) continue

    const skillMdPath = join(skillDir, 'SKILL.md')
    const content = await readFile(skillMdPath, 'utf-8').catch(() => '')
    const meta = parseSkillFrontmatter(content)

    // Count files (excluding __pycache__)
    const files = await readdir(skillDir).catch(() => [])
    const fileCount = files.filter(f => f !== '__pycache__' && !f.endsWith('.pyc')).length

    skills.push({
      name: meta.name || entry,
      description: meta.description || '',
      version: meta.version || '',
      author: meta.author || '',
      active,
      core: isCoreSkill(entry),
      allowedTools: meta.allowedTools,
      requiresSecrets: meta.requiresSecrets,
      installedFrom: meta.installedFrom || '',
      fileCount
    })
  }
}
