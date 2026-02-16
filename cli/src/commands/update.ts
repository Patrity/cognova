import { execSync } from 'child_process'
import * as p from '@clack/prompts'
import pc from 'picocolors'
import { findInstallDir, readMetadata } from '../lib/paths'
import { copyAppSource } from '../lib/install'

export async function update() {
  p.intro(pc.bgCyan(pc.black(' Second Brain Update ')))

  const installDir = findInstallDir()
  const metadata = readMetadata(installDir)

  if (!metadata) {
    p.log.error('No Second Brain installation found. Run `second-brain init` first.')
    process.exit(1)
  }

  const s = p.spinner()

  // Check for newer version
  s.start('Checking for updates')
  let latestVersion: string
  try {
    latestVersion = execSync('npm view second-brain version', { encoding: 'utf-8' }).trim()
  } catch {
    s.stop('Could not check npm registry')
    p.log.warn('Unable to check for updates. Rebuilding current version.')
    latestVersion = metadata.version
  }

  if (latestVersion === metadata.version) {
    s.stop(`Already on latest version (${metadata.version})`)
  } else {
    s.stop(`Update available: ${metadata.version} → ${pc.green(latestVersion)}`)

    // Download and extract latest
    s.start('Downloading latest version')
    try {
      const tmpDir = execSync('mktemp -d', { encoding: 'utf-8' }).trim()
      execSync(`npm pack second-brain@${latestVersion} --pack-destination ${tmpDir}`, { stdio: 'pipe' })
      execSync(`tar -xzf ${tmpDir}/second-brain-${latestVersion}.tgz -C ${tmpDir}`, { stdio: 'pipe' })
      copyAppSource(`${tmpDir}/package`, installDir)
      execSync(`rm -rf ${tmpDir}`)
      s.stop('Source files updated')
    } catch (err) {
      s.stop('Download failed')
      p.log.error(`Failed to download update: ${err}`)
      process.exit(1)
    }
  }

  // Rebuild
  s.start('Installing dependencies')
  execSync('pnpm install --frozen-lockfile', { cwd: installDir, stdio: 'pipe' })
  s.stop('Dependencies installed')

  s.start('Building application')
  execSync('pnpm build', {
    cwd: installDir,
    stdio: 'pipe',
    timeout: 600000,
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' }
  })
  s.stop('Build complete')

  // Restart
  s.start('Restarting application')
  try {
    execSync('pm2 restart second-brain', { stdio: 'pipe' })
    s.stop('Application restarted')
  } catch {
    s.stop('PM2 restart failed — start manually with `second-brain start`')
  }

  p.log.info(`Run ${pc.cyan('second-brain reset')} to update Claude config (skills, hooks, rules).`)
  p.outro(`Updated to v${latestVersion}`)
}
