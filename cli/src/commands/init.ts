import { execSync } from 'child_process'
import { join } from 'path'
import crypto from 'crypto'
import * as p from '@clack/prompts'
import pc from 'picocolors'
import { checkPrerequisites } from '../lib/prerequisites'
import { promptPersonality } from '../lib/personality'
import { setupInstallDir, writeMetadata } from '../lib/install'
import { getPackageVersion } from '../lib/paths'
import { setupVault } from '../lib/vault'
import { setupDatabase } from '../lib/database'
import { writeEnvFile } from '../lib/config'
import { installClaudeConfig } from '../lib/claude-config'
import { setupAndStart } from '../lib/process-manager'
import { waitForHealth } from '../lib/health'
import { loadProgress, saveProgress, clearProgress } from '../lib/progress'
import { withRetry, SkipError } from '../lib/retry'
import type { InitConfig, SetupProgress } from '../lib/types'

export async function init() {
  p.intro(pc.bgCyan(pc.black(' Cognova Setup ')))

  // Check for existing progress
  const existingProgress = loadProgress()
  let progress: SetupProgress = existingProgress || {
    completedSteps: [],
    partialConfig: {},
    startedAt: new Date().toISOString()
  }

  if (existingProgress) {
    p.log.warn('Previous setup was interrupted')
    const resume = await p.confirm({
      message: 'Resume from where you left off?',
      initialValue: true
    })
    if (p.isCancel(resume)) process.exit(0)

    if (!resume) {
      clearProgress()
      progress = {
        completedSteps: [],
        partialConfig: {},
        startedAt: new Date().toISOString()
      }
    }
  }

  // Step 1: Prerequisites
  const prereqs = progress.completedSteps.includes('prerequisites')
    ? { ok: true, dockerInstalled: true, dockerReady: true, nodeVersion: '', pythonVersion: '', pnpmVersion: '', claudeInstalled: true }
    : await checkPrerequisites()

  if (!progress.completedSteps.includes('prerequisites')) {
    progress.completedSteps.push('prerequisites')
    saveProgress(progress)
  }

  // Step 2: Agent Personality
  p.log.step(pc.bold('Agent Personality'))
  const personality = progress.partialConfig.personality || await promptPersonality()

  if (!progress.completedSteps.includes('personality')) {
    progress.partialConfig.personality = personality
    progress.completedSteps.push('personality')
    saveProgress(progress)
  }

  // Step 3: Install Location
  p.log.step(pc.bold('Installation'))
  const defaultDir = join(process.env.HOME || '~', 'cognova')
  let resolvedInstallDir: string

  if (progress.partialConfig.installDir) {
    resolvedInstallDir = progress.partialConfig.installDir
    p.log.info(`Using install directory: ${resolvedInstallDir}`)
  } else {
    const installDir = await p.text({
      message: 'Where should Cognova be installed?',
      placeholder: defaultDir,
      defaultValue: defaultDir
    })
    if (p.isCancel(installDir)) process.exit(0)

    resolvedInstallDir = installDir.replace('~', process.env.HOME || '')
    await setupInstallDir(resolvedInstallDir)

    progress.partialConfig.installDir = resolvedInstallDir
    progress.completedSteps.push('installDir')
    saveProgress(progress)
  }

  // Step 4: Vault
  p.log.step(pc.bold('Vault'))
  const vault = progress.partialConfig.vault || await setupVault()

  if (!progress.completedSteps.includes('vault')) {
    progress.partialConfig.vault = vault
    progress.completedSteps.push('vault')
    saveProgress(progress)
  }

  // Step 5: Database
  p.log.step(pc.bold('Database'))
  let database = progress.partialConfig.database

  if (!database) {
    try {
      database = await withRetry(
        'Database setup',
        () => setupDatabase(prereqs.dockerReady),
        { canSkip: false }
      )
      progress.partialConfig.database = database
      progress.completedSteps.push('database')
      saveProgress(progress)
    } catch (err) {
      if (err instanceof SkipError) {
        p.log.error('Database setup is required and cannot be skipped')
      }
      process.exit(1)
    }
  }

  // Step 6: Network Access
  p.log.step(pc.bold('Network Access'))
  let accessMode: 'localhost' | 'specific' | 'any'
  let appUrl: string

  if (progress.partialConfig.accessMode && progress.partialConfig.appUrl) {
    accessMode = progress.partialConfig.accessMode
    appUrl = progress.partialConfig.appUrl
    p.log.info(`Using access mode: ${accessMode} (${appUrl})`)
  } else {
    accessMode = await p.select({
      message: 'How will you access Cognova?',
      options: [
        { value: 'localhost', label: 'Local only', hint: 'http://localhost:3000' },
        { value: 'specific', label: 'Specific IP or domain', hint: 'LAN IP, hostname, or domain' },
        { value: 'any', label: 'Any connection', hint: 'Accepts requests from any origin (0.0.0.0)' }
      ]
    }) as 'localhost' | 'specific' | 'any'
    if (p.isCancel(accessMode)) process.exit(0)

    appUrl = 'http://localhost:3000'
    if (accessMode === 'specific') {
      const host = await p.text({
        message: 'IP address or domain (include port if not 80/443)',
        placeholder: '192.168.1.100:3000'
      })
      if (p.isCancel(host)) process.exit(0)
      appUrl = host.startsWith('http') ? host : `http://${host}`
    }

    progress.partialConfig.accessMode = accessMode
    progress.partialConfig.appUrl = appUrl
    progress.completedSteps.push('network')
    saveProgress(progress)
  }

  // Security warning — always shown, severity depends on access mode
  if (!progress.completedSteps.includes('security')) {
    p.log.warn(pc.yellow(pc.bold('Security Notice')))
    p.log.warn([
      'Cognova gives an AI agent unrestricted access to this machine.',
      'It can read, write, and execute anything via the embedded terminal',
      'and Claude Code CLI.',
      '',
      `  ${pc.dim('•')} Do not run on a personal machine or alongside sensitive data`,
      `  ${pc.dim('•')} Use a dedicated VM, container, or isolated environment`,
      `  ${pc.dim('•')} Put a reverse proxy with TLS in front for remote access`,
      `  ${pc.dim('•')} Do not store SSH keys, cloud creds, or production secrets here`
    ].join('\n'))

    if (accessMode === 'any') {
      p.log.warn(pc.red(
        'Binding to 0.0.0.0 exposes this to your entire network.'
      ))
    }

    const proceed = await p.confirm({
      message: 'I understand the risks. Continue?',
      initialValue: false
    })
    if (p.isCancel(proceed) || !proceed) process.exit(0)

    progress.completedSteps.push('security')
    saveProgress(progress)
  }

  // Step 7: Auth
  p.log.step(pc.bold('Authentication'))
  let adminEmail: string
  let adminPassword: string
  let adminName: string

  if (progress.partialConfig.auth) {
    adminEmail = progress.partialConfig.auth.adminEmail
    adminPassword = progress.partialConfig.auth.adminPassword
    adminName = progress.partialConfig.auth.adminName
    p.log.info(`Using admin: ${adminEmail}`)
  } else {
    const emailInput = await p.text({
      message: 'Admin email',
      placeholder: 'admin@example.com',
      defaultValue: 'admin@example.com'
    })
    if (p.isCancel(emailInput)) process.exit(0)
    adminEmail = emailInput as string

    while (true) {
      const pw = await p.password({
        message: 'Admin password',
        validate: (v) => {
          if (!v || v.length < 8) return 'Minimum 8 characters'
        }
      })
      if (p.isCancel(pw)) process.exit(0)

      const confirm = await p.password({
        message: 'Confirm password'
      })
      if (p.isCancel(confirm)) process.exit(0)

      if (pw === confirm) {
        adminPassword = pw as string
        break
      }
      p.log.warn('Passwords do not match. Try again.')
    }

    const nameInput = await p.text({
      message: 'Admin display name',
      placeholder: personality.userName,
      defaultValue: personality.userName
    })
    if (p.isCancel(nameInput)) process.exit(0)
    adminName = nameInput as string

    progress.partialConfig.auth = {
      adminEmail,
      adminPassword,
      adminName,
      authSecret: crypto.randomBytes(32).toString('base64')
    }
    progress.completedSteps.push('auth')
    saveProgress(progress)
  }

  // Assemble config
  const config: InitConfig = {
    personality,
    vault,
    database,
    auth: progress.partialConfig.auth || {
      adminEmail,
      adminPassword,
      adminName,
      authSecret: crypto.randomBytes(32).toString('base64')
    },
    appUrl,
    accessMode,
    installDir: resolvedInstallDir
  }

  // Step 8: Generate files
  p.log.step(pc.bold('Configuration'))

  const s = p.spinner()

  s.start('Writing .env')
  writeEnvFile(config)
  s.stop('.env created')

  s.start('Installing Claude Code configuration')
  await installClaudeConfig(config)
  s.stop('Claude config installed to ~/.claude/')

  writeMetadata(
    resolvedInstallDir,
    vault.path,
    getPackageVersion(),
    database.password,
    database.port
  )

  // Step 9: Install & Start
  p.log.step(pc.bold('Setup'))

  if (!progress.completedSteps.includes('install')) {
    try {
      await withRetry(
        'Dependency installation',
        async () => {
          s.start('Installing dependencies')
          execSync('pnpm install', { cwd: resolvedInstallDir, stdio: 'pipe' })
          s.stop('Dependencies installed')
        },
        { canSkip: false }
      )
      progress.completedSteps.push('install')
      saveProgress(progress)
    } catch (err) {
      s.stop('Dependency installation failed')
      if (err instanceof SkipError) {
        p.log.error('Dependency installation is required and cannot be skipped')
      }
      process.exit(1)
    }
  } else {
    p.log.info('Dependencies already installed')
  }

  p.log.step(pc.bold('Launch'))

  if (!progress.completedSteps.includes('pm2')) {
    try {
      await withRetry(
        'PM2 setup and start',
        () => setupAndStart(config),
        { canSkip: false }
      )
      progress.completedSteps.push('pm2')
      saveProgress(progress)
    } catch (err) {
      if (err instanceof SkipError) {
        p.log.error('PM2 setup is required and cannot be skipped')
      }
      process.exit(1)
    }
  } else {
    p.log.info('PM2 already configured')
  }

  // Health check (always use localhost — we're running on the same machine)
  if (!progress.completedSteps.includes('health')) {
    try {
      await withRetry(
        'Health check',
        () => waitForHealth('http://localhost:3000'),
        { canSkip: true }
      )
      progress.completedSteps.push('health')
      saveProgress(progress)
    } catch (err) {
      if (err instanceof SkipError) {
        p.log.warn('Health check skipped - app may not be fully started')
        p.log.info('Check status with: pm2 status')
      } else {
        process.exit(1)
      }
    }
  } else {
    p.log.info('App already healthy')
  }

  // Step 10: Summary
  p.log.step(pc.bold('Summary'))
  p.log.info([
    '',
    `  ${pc.cyan('App URL:')}        ${config.appUrl}`,
    `  ${pc.cyan('Admin Login:')}    ${config.auth.adminEmail}`,
    `  ${pc.cyan('Vault:')}          ${vault.path}`,
    `  ${pc.cyan('Install Dir:')}    ${resolvedInstallDir}`,
    `  ${pc.cyan('Agent:')}          ${personality.agentName}`,
    '',
    `  ${pc.dim('Manage:')}`,
    `    cognova start     Start the app`,
    `    cognova stop      Stop the app`,
    `    cognova restart   Restart the app`,
    `    cognova update    Update to latest version`,
    `    cognova doctor    Check health`,
    `    cognova reset     Re-generate configs`,
    '',
    `    pm2 logs cognova  View logs`,
    `    pm2 monit              Monitor resources`,
    ''
  ].join('\n'))

  p.outro(`${personality.agentName} is ready. Open ${pc.underline(config.appUrl)} to get started.`)

  // Clear progress file after successful setup
  clearProgress()
}
