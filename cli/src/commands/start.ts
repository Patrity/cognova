import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import { findInstallDir } from '../lib/paths'

export async function start() {
  const installDir = findInstallDir()
  const ecosystem = join(installDir, 'ecosystem.config.cjs')

  if (!existsSync(ecosystem)) {
    console.error('No ecosystem.config.cjs found. Run `second-brain init` first.')
    process.exit(1)
  }

  execSync('pm2 start ecosystem.config.cjs', { cwd: installDir, stdio: 'inherit' })
  console.log('Second Brain started.')
}

export async function stop() {
  try {
    execSync('pm2 stop second-brain', { stdio: 'inherit' })
    console.log('Second Brain stopped.')
  } catch {
    console.error('Failed to stop. Is Second Brain running?')
  }
}

export async function restart() {
  try {
    execSync('pm2 restart second-brain', { stdio: 'inherit' })
    console.log('Second Brain restarted.')
  } catch {
    console.error('Failed to restart. Is Second Brain running?')
  }
}
