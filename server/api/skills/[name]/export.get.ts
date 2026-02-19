import { stat } from 'fs/promises'
import { join } from 'path'
import AdmZip from 'adm-zip'
import { getSkillsDir, getInactiveSkillsDir, validateSkillName } from '~~/server/utils/skills-path'

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name')
  if (!name)
    throw createError({ statusCode: 400, message: 'Skill name required' })

  const nameError = validateSkillName(name)
  if (nameError)
    throw createError({ statusCode: 400, message: nameError })

  // Check active first, then inactive
  const activeDir = join(getSkillsDir(), name)
  const inactiveDir = join(getInactiveSkillsDir(), name)

  let skillDir = ''

  const activeStat = await stat(activeDir).catch(() => null)
  if (activeStat?.isDirectory()) {
    skillDir = activeDir
  } else {
    const inactiveStat = await stat(inactiveDir).catch(() => null)
    if (inactiveStat?.isDirectory())
      skillDir = inactiveDir
  }

  if (!skillDir)
    throw createError({ statusCode: 404, message: `Skill '${name}' not found` })

  const zip = new AdmZip()
  zip.addLocalFolder(skillDir, name, /^(?!.*(__pycache__|\.pyc))/)

  const buffer = zip.toBuffer()

  setResponseHeaders(event, {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${name}.zip"`,
    'Content-Length': String(buffer.length)
  })

  return send(event, buffer)
})
