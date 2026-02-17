import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import * as p from '@clack/prompts'
import pc from 'picocolors'
import { findInstallDir, readMetadata, getClaudeDir } from '../lib/paths'

interface Check {
  name: string
  check: () => boolean | string
}

export async function doctor() {
  p.intro(pc.bgCyan(pc.black(' Cognova Doctor ')))

  const installDir = findInstallDir()
  const claudeDir = getClaudeDir()
  const metadata = readMetadata(installDir)

  if (metadata) {
    p.log.info(`Install: ${metadata.installDir} (v${metadata.version})`)
  }

  const checks: Check[] = [
    {
      name: '.env file',
      check: () => existsSync(join(installDir, '.env'))
    },
    {
      name: 'node_modules',
      check: () => existsSync(join(installDir, 'node_modules'))
    },
    {
      name: 'Build output',
      check: () => existsSync(join(installDir, '.output', 'server', 'index.mjs'))
    },
    {
      name: '~/.claude/CLAUDE.md',
      check: () => existsSync(join(claudeDir, 'CLAUDE.md'))
    },
    {
      name: '~/.claude/skills/',
      check: () => existsSync(join(claudeDir, 'skills'))
    },
    {
      name: '~/.claude/hooks/',
      check: () => existsSync(join(claudeDir, 'hooks'))
    },
    {
      name: '~/.claude/rules/',
      check: () => existsSync(join(claudeDir, 'rules'))
    },
    {
      name: '~/.claude/settings.json',
      check: () => existsSync(join(claudeDir, 'settings.json'))
    },
    {
      name: 'Claude Code CLI',
      check: () => {
        try {
          execSync('claude --version', { stdio: 'pipe' })
          return true
        } catch {
          return false
        }
      }
    },
    {
      name: 'Python 3',
      check: () => {
        try {
          execSync('python3 --version', { stdio: 'pipe' })
          return true
        } catch {
          return false
        }
      }
    },
    {
      name: 'PM2 process',
      check: () => {
        try {
          const out = execSync('pm2 jlist', { encoding: 'utf-8' })
          const procs = JSON.parse(out)
          return procs.some((proc: { name: string, pm2_env?: { status?: string } }) =>
            proc.name === 'cognova' && proc.pm2_env?.status === 'online'
          )
        } catch {
          return false
        }
      }
    },
    {
      name: 'App health endpoint',
      check: () => {
        try {
          const result = execSync('curl -sf http://localhost:3000/api/health', { encoding: 'utf-8' })
          const data = JSON.parse(result)
          return data.status === 'ok'
        } catch {
          return false
        }
      }
    },
    {
      name: 'Database connection',
      check: () => {
        try {
          const result = execSync('curl -sf http://localhost:3000/api/health', { encoding: 'utf-8' })
          const data = JSON.parse(result)
          return data.database?.available === true
        } catch {
          return false
        }
      }
    },
    {
      name: 'Vault directory',
      check: () => {
        if (!metadata) return false
        return existsSync(metadata.vaultPath)
      }
    },
    {
      name: 'Version up to date',
      check: () => {
        if (!metadata) return 'unknown'
        try {
          const latest = execSync('npm view cognova version', { encoding: 'utf-8' }).trim()
          return latest === metadata.version ? true : `outdated (${metadata.version} → ${latest})`
        } catch {
          return 'could not check'
        }
      }
    }
  ]

  let passed = 0
  let failed = 0

  for (const { name, check } of checks) {
    try {
      const result = check()
      if (result === true) {
        p.log.success(`${pc.green('PASS')} ${name}`)
        passed++
      } else if (result === false) {
        p.log.error(`${pc.red('FAIL')} ${name}`)
        failed++
      } else {
        p.log.warn(`${pc.yellow('WARN')} ${name}: ${result}`)
      }
    } catch {
      p.log.error(`${pc.red('FAIL')} ${name}`)
      failed++
    }
  }

  p.outro(`${passed} passed, ${failed} failed`)
}
