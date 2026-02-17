import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { generateEnvFile } from '../templates/env'
import type { InitConfig } from './types'

export function writeEnvFile(config: InitConfig) {
  const content = generateEnvFile(config)
  writeFileSync(join(config.installDir, '.env'), content)
}

/** Parse the install directory's .env file into a key-value object */
export function loadEnvFile(installDir: string): Record<string, string> {
  try {
    const content = readFileSync(join(installDir, '.env'), 'utf-8')
    const env: Record<string, string> = {}
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1)
    }
    return env
  } catch {
    return {}
  }
}
