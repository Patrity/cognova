import { readFile } from 'fs/promises'
import { join } from 'path'
import { getVaultRoot } from '~~/server/utils/path-validator'

export default defineEventHandler(async () => {
  const vaultRoot = getVaultRoot()
  const indexPath = join(vaultRoot, 'index.md')

  try {
    const content = await readFile(indexPath, 'utf-8')
    return {
      data: {
        hasCustomHome: true,
        content
      }
    }
  } catch {
    // index.md doesn't exist, return default
    return {
      data: {
        hasCustomHome: false,
        content: null
      }
    }
  }
})
