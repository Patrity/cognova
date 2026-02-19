import { mkdir, writeFile, stat } from 'fs/promises'
import { join } from 'path'
import { getSkillsDir, validateSkillName } from '~~/server/utils/skills-path'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ name: string, description?: string }>(event)
  if (!body?.name)
    throw createError({ statusCode: 400, message: 'Skill name is required' })

  const nameError = validateSkillName(body.name)
  if (nameError)
    throw createError({ statusCode: 400, message: nameError })

  const skillDir = join(getSkillsDir(), body.name)

  // Check if already exists
  const existing = await stat(skillDir).catch(() => null)
  if (existing)
    throw createError({ statusCode: 409, message: `Skill '${body.name}' already exists` })

  await mkdir(skillDir, { recursive: true })

  const description = body.description || `Description for ${body.name}`

  const skillMd = `---
name: ${body.name}
description: ${description}
allowed-tools: Bash, Read
metadata:
  version: "1.0.0"
  requires-secrets: []
  author: ""
  repository: ""
  installed-from: ""
---

# ${body.name}

${description}

## Commands

\`\`\`bash
python3 ~/.claude/skills/${body.name}/${body.name}.py <command>
\`\`\`
`

  await writeFile(join(skillDir, 'SKILL.md'), skillMd, 'utf-8')

  return { data: { name: body.name, path: skillDir } }
})
