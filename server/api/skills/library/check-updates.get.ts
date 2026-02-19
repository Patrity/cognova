import { readFile, readdir, stat } from 'fs/promises'
import { join } from 'path'
import { getDb } from '~~/server/db'
import { getSkillsDir, getInactiveSkillsDir, parseSkillFrontmatter } from '~~/server/utils/skills-path'

export default defineEventHandler(async () => {
  const db = getDb()
  const catalogItems = await db.query.skillsCatalog.findMany()

  if (catalogItems.length === 0)
    return { data: { updates: [] } }

  const catalogByName = new Map(catalogItems.map(c => [c.name, c]))
  const updates: { name: string, installed: string, latest: string }[] = []

  // Scan both active and inactive skill dirs
  for (const dir of [getSkillsDir(), getInactiveSkillsDir()]) {
    const dirStat = await stat(dir).catch(() => null)
    if (!dirStat) continue

    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const skillMdPath = join(dir, entry.name, 'SKILL.md')
      const content = await readFile(skillMdPath, 'utf-8').catch(() => '')
      if (!content) continue

      const meta = parseSkillFrontmatter(content)
      if (!meta.installedFrom) continue

      const catalogEntry = catalogByName.get(entry.name)
      if (!catalogEntry) continue

      if (meta.version && meta.version !== catalogEntry.version) {
        updates.push({
          name: entry.name,
          installed: meta.version,
          latest: catalogEntry.version
        })
      }
    }
  }

  return { data: { updates } }
})
