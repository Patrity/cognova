import { readFile, stat } from 'fs/promises'
import { join } from 'path'
import { getDb } from '~~/server/db'
import { getSkillsDir, getInactiveSkillsDir, parseSkillFrontmatter } from '~~/server/utils/skills-path'

export default defineEventHandler(async () => {
  const db = getDb()
  const catalogItems = await db.query.skillsCatalog.findMany()

  // Check which skills are already installed
  const skillsDir = getSkillsDir()
  const inactiveDir = getInactiveSkillsDir()

  const items = await Promise.all(catalogItems.map(async (item) => {
    const activePath = join(skillsDir, item.name, 'SKILL.md')
    const inactivePath = join(inactiveDir, item.name, 'SKILL.md')

    let installed = false
    let installedVersion: string | undefined

    // Check active skills
    const activeStat = await stat(activePath).catch(() => null)
    if (activeStat) {
      installed = true
      const content = await readFile(activePath, 'utf-8').catch(() => '')
      const meta = parseSkillFrontmatter(content)
      installedVersion = meta.version
    } else {
      // Check inactive skills
      const inactiveStat = await stat(inactivePath).catch(() => null)
      if (inactiveStat) {
        installed = true
        const content = await readFile(inactivePath, 'utf-8').catch(() => '')
        const meta = parseSkillFrontmatter(content)
        installedVersion = meta.version
      }
    }

    return {
      id: item.id,
      name: item.name,
      description: item.description,
      version: item.version,
      author: item.author,
      tags: item.tags || [],
      requiresSecrets: item.requiresSecrets || [],
      files: item.files || [],
      updatedAt: item.updatedAt.toISOString(),
      installed,
      installedVersion,
      hasUpdate: installed && installedVersion ? installedVersion !== item.version : false
    }
  }))

  return { data: items }
})
