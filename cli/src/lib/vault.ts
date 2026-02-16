import { mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import * as p from '@clack/prompts'
import type { VaultConfig } from './types'

const PARA_FOLDERS = ['inbox', 'areas', 'projects', 'resources', 'archive']

export async function setupVault(): Promise<VaultConfig> {
  const defaultPath = join(process.env.HOME || '~', 'vault')

  const vaultPath = await p.text({
    message: 'Where should your vault be stored?',
    placeholder: defaultPath,
    defaultValue: defaultPath
  })
  if (p.isCancel(vaultPath)) process.exit(0)

  const resolvedPath = vaultPath.replace('~', process.env.HOME || '')

  if (existsSync(resolvedPath)) {
    p.log.info(`Vault directory exists: ${resolvedPath}`)
  } else {
    const s = p.spinner()
    s.start('Creating vault with PARA structure')

    mkdirSync(resolvedPath, { recursive: true })
    for (const folder of PARA_FOLDERS)
      mkdirSync(join(resolvedPath, folder), { recursive: true })

    s.stop('Vault created with PARA folders (inbox, areas, projects, resources, archive)')
  }

  // Ensure PARA folders exist even if vault directory already existed
  for (const folder of PARA_FOLDERS) {
    const folderPath = join(resolvedPath, folder)
    if (!existsSync(folderPath))
      mkdirSync(folderPath, { recursive: true })
  }

  return { path: resolvedPath }
}
