import { mkdir, writeFile, stat, rm } from 'fs/promises'
import { join } from 'path'
import { eq } from 'drizzle-orm'
import { getDb } from '~~/server/db'
import * as schema from '~~/server/db/schema'
import { getSkillsDir } from '~~/server/utils/skills-path'

const REPO_RAW_BASE = 'https://raw.githubusercontent.com/Patrity/cognova-skills/main'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ name: string, force?: boolean }>(event)
  if (!body?.name)
    throw createError({ statusCode: 400, message: 'Skill name is required' })

  const db = getDb()
  const catalogItem = await db.query.skillsCatalog.findFirst({
    where: eq(schema.skillsCatalog.name, body.name)
  })

  if (!catalogItem)
    throw createError({ statusCode: 404, message: `Skill '${body.name}' not found in library` })

  const skillDir = join(getSkillsDir(), body.name)

  // Check if already installed
  const existing = await stat(skillDir).catch(() => null)
  if (existing && !body.force)
    throw createError({ statusCode: 409, message: `Skill '${body.name}' is already installed` })

  // Force update: remove existing directory first
  if (existing && body.force)
    await rm(skillDir, { recursive: true, force: true })

  await mkdir(skillDir, { recursive: true })

  const files = catalogItem.files || []
  if (files.length === 0)
    throw createError({ statusCode: 500, message: 'Skill has no files listed in registry' })

  // Download each file from GitHub
  for (const file of files) {
    const url = `${REPO_RAW_BASE}/${body.name}/${file}`
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`[skills/library/install] Failed to fetch ${url}: ${response.status}`)
      continue
    }

    let content = await response.text()

    // Inject installed-from into SKILL.md frontmatter
    if (file === 'SKILL.md' && content.startsWith('---')) {
      content = content.replace(
        /^---\n/,
        '---\n  installed-from: "cognova-skills"\n'
      )
    }

    // Handle nested paths
    const filePath = join(skillDir, file)
    const fileDir = filePath.substring(0, filePath.lastIndexOf('/'))
    if (fileDir !== skillDir) {
      await mkdir(fileDir, { recursive: true })
    }

    await writeFile(filePath, content, 'utf-8')
  }

  return {
    data: {
      name: body.name,
      installed: true,
      version: catalogItem.version,
      fileCount: files.length
    }
  }
})
