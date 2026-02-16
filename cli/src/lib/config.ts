import { writeFileSync } from 'fs'
import { join } from 'path'
import { generateEnvFile } from '../templates/env'
import type { InitConfig } from './types'

export function writeEnvFile(config: InitConfig) {
  const content = generateEnvFile(config)
  writeFileSync(join(config.installDir, '.env'), content)
}
