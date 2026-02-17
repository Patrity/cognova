import { execSync } from 'child_process'
import { join } from 'path'
import crypto from 'crypto'
import * as p from '@clack/prompts'
import pc from 'picocolors'
import { checkPrerequisites } from '../lib/prerequisites'
import { promptPersonality } from '../lib/personality'
import { setupInstallDir, writeMetadata } from '../lib/install'
import { setupVault } from '../lib/vault'
import { setupDatabase } from '../lib/database'
import { writeEnvFile } from '../lib/config'
import { installClaudeConfig } from '../lib/claude-config'
import { setupAndStart } from '../lib/process-manager'
import { waitForHealth } from '../lib/health'
import type { InitConfig } from '../lib/types'

export async function init() {
  p.intro(pc.bgCyan(pc.black(' Second Brain Setup ')))

  // Step 1: Prerequisites
  const prereqs = await checkPrerequisites()

  // Step 2: Agent Personality
  p.log.step(pc.bold('Agent Personality'))
  const personality = await promptPersonality()

  // Step 3: Install Location
  p.log.step(pc.bold('Installation'))
  const defaultDir = join(process.env.HOME || '~', 'second-brain')
  const installDir = await p.text({
    message: 'Where should Second Brain be installed?',
    placeholder: defaultDir,
    defaultValue: defaultDir
  })
  if (p.isCancel(installDir)) process.exit(0)

  const resolvedInstallDir = installDir.replace('~', process.env.HOME || '')
  await setupInstallDir(resolvedInstallDir)

  // Step 4: Vault
  p.log.step(pc.bold('Vault'))
  const vault = await setupVault()

  // Step 5: Database
  p.log.step(pc.bold('Database'))
  const database = await setupDatabase(prereqs.hasDocker)

  // Step 6: Network Access
  p.log.step(pc.bold('Network Access'))
  const accessMode = await p.select({
    message: 'How will you access Second Brain?',
    options: [
      { value: 'localhost', label: 'Local only', hint: 'http://localhost:3000' },
      { value: 'specific', label: 'Specific IP or domain', hint: 'LAN IP, hostname, or domain' },
      { value: 'any', label: 'Any connection', hint: 'Accepts requests from any origin (0.0.0.0)' }
    ]
  })
  if (p.isCancel(accessMode)) process.exit(0)

  let appUrl = 'http://localhost:3000'
  if (accessMode === 'specific') {
    const host = await p.text({
      message: 'IP address or domain (include port if not 80/443)',
      placeholder: '192.168.1.100:3000'
    })
    if (p.isCancel(host)) process.exit(0)
    appUrl = host.startsWith('http') ? host : `http://${host}`
  }

  // Step 7: Auth
  p.log.step(pc.bold('Authentication'))
  const adminEmail = await p.text({
    message: 'Admin email',
    placeholder: 'admin@example.com',
    defaultValue: 'admin@example.com'
  })
  if (p.isCancel(adminEmail)) process.exit(0)

  let adminPassword: string
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
      adminPassword = pw
      break
    }
    p.log.warn('Passwords do not match. Try again.')
  }

  const adminName = await p.text({
    message: 'Admin display name',
    placeholder: personality.userName,
    defaultValue: personality.userName
  })
  if (p.isCancel(adminName)) process.exit(0)

  // Step 8: Integrations
  p.log.step(pc.bold('Integrations'))
  const wantGotify = await p.confirm({
    message: 'Set up Gotify push notifications?',
    initialValue: false
  })
  if (p.isCancel(wantGotify)) process.exit(0)

  let gotifyUrl: string | undefined
  let gotifyToken: string | undefined

  if (wantGotify) {
    const url = await p.text({
      message: 'Gotify server URL',
      placeholder: 'https://gotify.example.com'
    })
    if (p.isCancel(url)) process.exit(0)
    gotifyUrl = url

    const token = await p.text({
      message: 'Gotify application token'
    })
    if (p.isCancel(token)) process.exit(0)
    gotifyToken = token
  }

  // Assemble config
  const config: InitConfig = {
    personality,
    vault,
    database,
    auth: {
      adminEmail,
      adminPassword,
      adminName,
      authSecret: crypto.randomBytes(32).toString('base64')
    },
    integrations: {
      gotifyUrl,
      gotifyToken
    },
    appUrl,
    accessMode: accessMode as 'localhost' | 'specific' | 'any',
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

  writeMetadata(resolvedInstallDir, vault.path, '0.1.0')

  // Step 9: Build & Start
  p.log.step(pc.bold('Build'))

  s.start('Installing dependencies')
  execSync('pnpm install --frozen-lockfile', { cwd: resolvedInstallDir, stdio: 'pipe' })
  s.stop('Dependencies installed')

  s.start('Building application (this may take a few minutes)')
  execSync('pnpm build', {
    cwd: resolvedInstallDir,
    stdio: 'pipe',
    timeout: 600000,
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' }
  })
  s.stop('Build complete')

  p.log.step(pc.bold('Launch'))
  await setupAndStart(config)

  // Health check (always use localhost — we're running on the same machine)
  await waitForHealth('http://localhost:3000')

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
    `    second-brain start     Start the app`,
    `    second-brain stop      Stop the app`,
    `    second-brain restart   Restart the app`,
    `    second-brain update    Update to latest version`,
    `    second-brain doctor    Check health`,
    `    second-brain reset     Re-generate configs`,
    '',
    `    pm2 logs second-brain  View logs`,
    `    pm2 monit              Monitor resources`,
    ''
  ].join('\n'))

  p.outro(`${personality.agentName} is ready. Open ${pc.underline(config.appUrl)} to get started.`)
}
