import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import { findInstallDir } from '../lib/paths'

export async function start() {
  const installDir = findInstallDir()
  const ecosystem = join(installDir, 'ecosystem.config.cjs')

  if (!existsSync(ecosystem)) {
    console.error('No ecosystem.config.cjs found. Run `cognova init` first.')
    process.exit(1)
  }

  execSync('pm2 start ecosystem.config.cjs', { cwd: installDir, stdio: 'inherit' })
  console.log('Cognova started.')
}

export async function stop() {
  try {
    execSync('pm2 stop cognova', { stdio: 'inherit' })
    console.log('Cognova stopped.')
  } catch {
    console.error('Failed to stop. Is Cognova running?')
  }
}

export async function restart() {
  try {
    execSync('pm2 restart cognova', { stdio: 'inherit' })
    console.log('Cognova restarted.')
  } catch {
    console.error('Failed to restart. Is Cognova running?')
  }
}
