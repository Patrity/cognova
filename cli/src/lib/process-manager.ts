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
      // Use sudo on Linux where global installs need root
      const cmd = process.platform === 'linux' ? 'sudo npm install -g pm2' : 'npm install -g pm2'
      execSync(cmd, { stdio: 'inherit' })
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
  s.start('Starting Cognova with PM2')
  try {
    execSync('pm2 start ecosystem.config.cjs', {
      cwd: config.installDir,
      stdio: 'pipe'
    })
    s.stop('Cognova is running')
  } catch (err) {
    s.stop('Failed to start')
    const errMsg = String(err)

    // Check for NVM-related issues
    if (errMsg.includes('nvm') && errMsg.includes('not found')) {
      p.log.error('PM2 + NVM compatibility issue detected')
      p.log.info('Try: pm2 delete cognova && pm2 start ecosystem.config.cjs')
      p.log.info(`Working directory: ${config.installDir}`)
    } else {
      p.log.error(`PM2 error: ${err}`)
    }

    throw err
  }
}
