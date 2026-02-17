import * as p from '@clack/prompts'
import pc from 'picocolors'
import { findInstallDir, readMetadata } from '../lib/paths'
import { installClaudeConfig } from '../lib/claude-config'
import { promptPersonality } from '../lib/personality'
import type { InitConfig } from '../lib/types'

export async function reset() {
  p.intro(pc.bgCyan(pc.black(' Cognova Reset ')))

  const installDir = findInstallDir()
  const metadata = readMetadata(installDir)

  if (!metadata) {
    p.log.error('No Cognova installation found. Run `cognova init` first.')
    process.exit(1)
  }

  const what = await p.multiselect({
    message: 'What do you want to reset?',
    options: [
      { value: 'claude-md', label: 'CLAUDE.md', hint: 'Re-generate agent identity (re-runs personality prompts)' },
      { value: 'skills', label: 'Skills', hint: 'Re-copy skills to ~/.claude/skills/' },
      { value: 'hooks', label: 'Hooks', hint: 'Re-copy hooks to ~/.claude/hooks/' },
      { value: 'rules', label: 'Rules', hint: 'Re-copy rules to ~/.claude/rules/' },
      { value: 'settings', label: 'Settings', hint: 'Re-generate ~/.claude/settings.json' }
    ],
    required: true
  })

  if (p.isCancel(what)) {
    p.cancel('Reset cancelled.')
    process.exit(0)
  }

  const items = what as string[]

  let personality = null
  if (items.includes('claude-md')) {
    p.log.info('Let\'s reconfigure your agent personality.')
    personality = await promptPersonality()
  }

  const s = p.spinner()
  s.start('Resetting configuration')

  await installClaudeConfig({
    personality: personality || {
      agentName: 'Cognova',
      userName: 'User',
      tone: 'concise',
      traits: ['organized'],
      communicationStyle: 'mixed',
      proactivity: 'balanced'
    },
    vault: { path: metadata.vaultPath },
    database: { type: 'remote', connectionString: '' },
    auth: { adminEmail: '', adminPassword: '', adminName: '', authSecret: '' },
    appUrl: 'http://localhost:3000',
    accessMode: 'localhost',
    installDir: metadata.installDir
  } satisfies InitConfig, {
    claudeMd: items.includes('claude-md'),
    skills: items.includes('skills'),
    hooks: items.includes('hooks'),
    rules: items.includes('rules'),
    settings: items.includes('settings')
  })

  s.stop('Configuration reset')
  p.outro('Done! Changes will take effect in your next Claude Code session.')
}
