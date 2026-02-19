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
import type { InitConfig } from '../lib/types'

export async function init() {
  p.intro(pc.bgCyan(pc.black(' Cognova Setup ')))

  // Step 1: Prerequisites
  const prereqs = await checkPrerequisites()

  // Step 2: Agent Personality
  p.log.step(pc.bold('Agent Personality'))
  const personality = await promptPersonality()

  // Step 3: Install Location
  p.log.step(pc.bold('Installation'))
  const defaultDir = join(process.env.HOME || '~', 'cognova')
  const installDir = await p.text({
    message: 'Where should Cognova be installed?',
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
    message: 'How will you access Cognova?',
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

  // Security warning — always shown, severity depends on access mode
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

  writeMetadata(resolvedInstallDir, vault.path, getPackageVersion())

  // Step 9: Install & Start
  p.log.step(pc.bold('Setup'))

  s.start('Installing dependencies')
  execSync('pnpm install', { cwd: resolvedInstallDir, stdio: 'pipe' })
  s.stop('Dependencies installed')

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
}
