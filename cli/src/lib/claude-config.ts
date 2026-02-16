import { cpSync, mkdirSync, existsSync, writeFileSync, readFileSync } from 'fs'
import { join } from 'path'
import * as p from '@clack/prompts'
import { getClaudeDir, getPackageDir } from './paths'
import { generateClaudeMd } from '../templates/claude-md'
import { generateSettingsJson } from '../templates/settings-json'
import type { InitConfig } from './types'

interface InstallOptions {
  claudeMd?: boolean
  skills?: boolean
  hooks?: boolean
  rules?: boolean
  settings?: boolean
}

export async function installClaudeConfig(config: InitConfig, options?: InstallOptions) {
  const claudeDir = getClaudeDir()
  const sourceDir = join(getPackageDir(), 'Claude')
  const installAll = !options

  mkdirSync(claudeDir, { recursive: true })

  // Skills
  if (installAll || options?.skills) {
    const skillsSrc = join(sourceDir, 'skills')
    if (existsSync(skillsSrc))
      cpSync(skillsSrc, join(claudeDir, 'skills'), { recursive: true, force: true })
  }

  // Hooks
  if (installAll || options?.hooks) {
    const hooksSrc = join(sourceDir, 'hooks')
    if (existsSync(hooksSrc))
      cpSync(hooksSrc, join(claudeDir, 'hooks'), { recursive: true, force: true })
  }

  // Rules
  if (installAll || options?.rules) {
    const rulesSrc = join(sourceDir, 'rules')
    if (existsSync(rulesSrc))
      cpSync(rulesSrc, join(claudeDir, 'rules'), { recursive: true, force: true })
  }

  // CLAUDE.md
  if (installAll || options?.claudeMd) {
    const claudeMdPath = join(claudeDir, 'CLAUDE.md')

    if (existsSync(claudeMdPath) && installAll) {
      const overwrite = await p.confirm({
        message: '~/.claude/CLAUDE.md already exists. Overwrite?',
        initialValue: false
      })
      if (p.isCancel(overwrite)) process.exit(0)
      if (!overwrite) {
        p.log.info('Keeping existing CLAUDE.md')
      } else {
        writeFileSync(claudeMdPath, generateClaudeMd(config))
      }
    } else {
      writeFileSync(claudeMdPath, generateClaudeMd(config))
    }
  }

  // settings.json — merge with existing if present
  if (installAll || options?.settings) {
    const settingsPath = join(claudeDir, 'settings.json')

    if (existsSync(settingsPath) && installAll) {
      try {
        const existing = JSON.parse(readFileSync(settingsPath, 'utf-8'))
        const generated = JSON.parse(generateSettingsJson(config))

        // Merge: keep existing hooks, add/replace Second Brain hooks
        const merged = mergeSettings(existing, generated)
        writeFileSync(settingsPath, JSON.stringify(merged, null, 2) + '\n')
        p.log.info('Merged Second Brain hooks into existing settings.json')
      } catch {
        // If merge fails, just write the new one
        writeFileSync(settingsPath, generateSettingsJson(config))
      }
    } else {
      writeFileSync(settingsPath, generateSettingsJson(config))
    }
  }
}

function mergeSettings(existing: Record<string, unknown>, generated: Record<string, unknown>): Record<string, unknown> {
  // For hooks: the generated config replaces hook entries that reference our scripts
  // but preserves any user-added hooks
  const result = { ...existing }

  // Merge env vars
  if (generated.env) {
    result.env = { ...(existing.env as Record<string, string> || {}), ...(generated.env as Record<string, string>) }
  }

  // Replace hooks entirely with generated (our hooks are the complete set for Second Brain)
  if (generated.hooks) {
    result.hooks = generated.hooks
  }

  return result
}
