import { execSync } from 'child_process'
import { existsSync, cpSync, rmSync } from 'fs'
import { join } from 'path'
import * as p from '@clack/prompts'
import pc from 'picocolors'
import { findInstallDir, readMetadata } from '../lib/paths'
import { copyAppSource } from '../lib/install'
import { syncClaudeConfig } from '../lib/claude-config'
import { loadEnvFile } from '../lib/config'

/** Directories/files that make up the app source (backed up before update) */
const BACKUP_ITEMS = [
  'app',
  'server',
  'shared',
  'Claude',
  'nuxt.config.ts',
  'tsconfig.json',
  'drizzle.config.ts',
  'package.json',
  'pnpm-lock.yaml'
]

function createBackup(installDir: string): string {
  const backupDir = join(installDir, '.update-backup')
  if (existsSync(backupDir))
    rmSync(backupDir, { recursive: true })

  for (const item of BACKUP_ITEMS) {
    const src = join(installDir, item)
    if (!existsSync(src)) continue
    const dest = join(backupDir, item)
    cpSync(src, dest, { recursive: true })
  }

  return backupDir
}

function restoreBackup(installDir: string, backupDir: string) {
  for (const item of BACKUP_ITEMS) {
    const src = join(backupDir, item)
    if (!existsSync(src)) continue
    const dest = join(installDir, item)
    if (existsSync(dest))
      rmSync(dest, { recursive: true })
    cpSync(src, dest, { recursive: true })
  }
}

function cleanupBackup(backupDir: string) {
  if (existsSync(backupDir))
    rmSync(backupDir, { recursive: true })
}

export async function update() {
  p.intro(pc.bgCyan(pc.black(' Cognova Update ')))

  const installDir = findInstallDir()
  const metadata = readMetadata(installDir)

  if (!metadata) {
    p.log.error('No Cognova installation found. Run `cognova init` first.')
    process.exit(1)
  }

  const s = p.spinner()

  // Check for newer version
  s.start('Checking for updates')
  let latestVersion: string
  try {
    latestVersion = execSync('npm view cognova version', { encoding: 'utf-8' }).trim()
  } catch {
    s.stop('Could not check npm registry')
    p.log.warn('Unable to check for updates. Rebuilding current version.')
    latestVersion = metadata.version
  }

  if (latestVersion === metadata.version) {
    s.stop(`Already on latest version (${metadata.version})`)
  } else {
    s.stop(`Update available: ${metadata.version} → ${pc.green(latestVersion)}`)
  }

  // Create backup before making any changes
  s.start('Creating backup')
  const backupDir = createBackup(installDir)
  s.stop('Backup created')

  let updateFailed = false

  try {
    if (latestVersion !== metadata.version) {
      // Download and extract latest
      s.start('Downloading latest version')
      const tmpDir = execSync('mktemp -d', { encoding: 'utf-8' }).trim()
      try {
        execSync(`npm pack cognova@${latestVersion} --pack-destination ${tmpDir}`, { stdio: 'pipe' })
        execSync(`tar -xzf ${tmpDir}/cognova-${latestVersion}.tgz -C ${tmpDir}`, { stdio: 'pipe' })
        copyAppSource(`${tmpDir}/package`, installDir)
        s.stop('Source files updated')
      } finally {
        rmSync(tmpDir, { recursive: true, force: true })
      }
    }

    // Sync bundled Claude config (skills, hooks, rules) to ~/.claude/
    s.start('Syncing Claude config')
    syncClaudeConfig(installDir)
    s.stop('Claude config synced (skills, hooks, rules)')

    // Load .env from install dir so child processes get DATABASE_URL etc.
    const dotenv = loadEnvFile(installDir)
    const envWithDotenv = { ...process.env, ...dotenv }

    // Rebuild
    s.start('Installing dependencies')
    execSync('pnpm install', { cwd: installDir, stdio: 'pipe' })
    s.stop('Dependencies installed')

    // Run database migrations
    s.start('Running database migrations')
    execSync('pnpm db:migrate', { cwd: installDir, stdio: 'pipe', env: envWithDotenv })
    s.stop('Migrations complete')

    s.start('Building application')
    execSync('pnpm build', {
      cwd: installDir,
      stdio: 'pipe',
      timeout: 600000,
      env: { ...envWithDotenv, NODE_OPTIONS: '--max-old-space-size=4096' }
    })
    s.stop('Build complete')
  } catch (err) {
    updateFailed = true
    s.stop(pc.red('Update failed'))

    const execErr = err as { message?: string, stderr?: Buffer | string, stdout?: Buffer | string }
    p.log.error(`Error: ${execErr.message || err}`)
    if (execErr.stdout)
      p.log.error(pc.dim(String(execErr.stdout).trim()))
    if (execErr.stderr)
      p.log.error(pc.dim(String(execErr.stderr).trim()))
    p.log.step(pc.bold('Rolling back'))

    const rollbackSpinner = p.spinner()
    rollbackSpinner.start('Restoring previous version')
    try {
      restoreBackup(installDir, backupDir)

      // Reinstall dependencies for the restored version
      execSync('pnpm install', { cwd: installDir, stdio: 'pipe' })

      rollbackSpinner.stop('Previous version restored')
      p.log.info('Your previous installation has been restored.')
    } catch (rollbackErr) {
      rollbackSpinner.stop(pc.red('Rollback failed'))
      p.log.error(`Rollback failed: ${rollbackErr instanceof Error ? rollbackErr.message : rollbackErr}`)
      p.log.error(`Manual recovery: backup is at ${backupDir}`)
      p.outro('Update and rollback both failed. See errors above.')
      process.exit(1)
    }
  }

  // Clean up backup on success
  if (!updateFailed)
    cleanupBackup(backupDir)

  if (updateFailed) {
    p.outro('Update failed. Previous version has been restored. Try again later.')
    process.exit(1)
  }

  // Restart
  s.start('Restarting application')
  try {
    execSync('pm2 restart cognova', { stdio: 'pipe' })
    s.stop('Application restarted')
  } catch {
    s.stop('PM2 restart failed — start manually with `cognova start`')
  }

  p.log.info(`Run ${pc.cyan('cognova reset')} to regenerate CLAUDE.md or settings.json.`)
  p.outro(`Updated to v${latestVersion}`)
}
