import { execSync } from 'child_process'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import * as p from '@clack/prompts'
import { generatePm2Ecosystem } from '../templates/pm2-ecosystem'
import type { InitConfig } from './types'

export async function setupAndStart(config: InitConfig) {
  // Check PM2
  try {
    execSync('pm2 --version', { stdio: 'pipe' })
  } catch {
    const install = await p.confirm({
      message: 'PM2 not found. Install it globally?',
      initialValue: true
    })
    if (p.isCancel(install)) process.exit(0)

    if (install) {
      const s = p.spinner()
      s.start('Installing PM2')
      execSync('npm install -g pm2', { stdio: 'pipe' })
      s.stop('PM2 installed')
    } else {
      p.log.warn('Skipping PM2. Start manually with: node .output/server/index.mjs')
      return
    }
  }

  // Create logs directory
  const logsDir = join(config.installDir, 'logs')
  if (!existsSync(logsDir))
    mkdirSync(logsDir, { recursive: true })

  // Generate ecosystem file
  const ecosystem = generatePm2Ecosystem(config)
  writeFileSync(join(config.installDir, 'ecosystem.config.cjs'), ecosystem)

  // Start
  const s = p.spinner()
  s.start('Starting Second Brain with PM2')
  try {
    execSync('pm2 start ecosystem.config.cjs', {
      cwd: config.installDir,
      stdio: 'pipe'
    })
    s.stop('Second Brain is running')
  } catch (err) {
    s.stop('Failed to start')
    p.log.error(`PM2 error: ${err}`)
  }
}
