import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import * as p from '@clack/prompts'
import pc from 'picocolors'
import { findInstallDir, readMetadata, getClaudeDir } from '../lib/paths'

interface Check {
  name: string
  check: () => boolean | string
  fix?: () => Promise<void>
  fixDescription?: string
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
      check: () => existsSync(join(installDir, '.env')),
      fixDescription: 'Run "cognova reset" to regenerate'
    },
    {
      name: 'node_modules',
      check: () => existsSync(join(installDir, 'node_modules')),
      fix: async () => {
        const s = p.spinner()
        s.start('Installing dependencies')
        execSync('pnpm install', { cwd: installDir, stdio: 'inherit' })
        s.stop('Dependencies installed')
      },
      fixDescription: 'Install dependencies'
    },
    {
      name: 'Build output',
      check: () => existsSync(join(installDir, '.output', 'server', 'index.mjs')),
      fix: async () => {
        const s = p.spinner()
        s.start('Building application')
        execSync('pnpm build', { cwd: installDir, stdio: 'inherit' })
        s.stop('Build complete')
      },
      fixDescription: 'Build the application'
    },
    {
      name: '~/.claude/CLAUDE.md',
      check: () => existsSync(join(claudeDir, 'CLAUDE.md')),
      fixDescription: 'Run "cognova reset --claude" to reinstall'
    },
    {
      name: '~/.claude/skills/',
      check: () => existsSync(join(claudeDir, 'skills')),
      fixDescription: 'Run "cognova reset --claude" to reinstall'
    },
    {
      name: '~/.claude/hooks/',
      check: () => existsSync(join(claudeDir, 'hooks')),
      fixDescription: 'Run "cognova reset --claude" to reinstall'
    },
    {
      name: '~/.claude/rules/',
      check: () => existsSync(join(claudeDir, 'rules')),
      fixDescription: 'Run "cognova reset --claude" to reinstall'
    },
    {
      name: '~/.claude/settings.json',
      check: () => existsSync(join(claudeDir, 'settings.json')),
      fixDescription: 'Run "cognova reset --claude" to reinstall'
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
      },
      fixDescription: 'Install with: npm install -g @anthropic-ai/claude-code'
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
      },
      fixDescription: 'Install from https://python.org/'
    },
    {
      name: 'Docker daemon',
      check: () => {
        try {
          execSync('docker info', { stdio: 'pipe' })
          return true
        } catch {
          return false
        }
      },
      fix: async () => {
        const s = p.spinner()
        s.start('Starting Docker daemon')
        try {
          if (process.platform === 'darwin') {
            execSync('open -a Docker', { stdio: 'pipe' })
            p.log.info('Docker Desktop is starting - this may take a moment')
          } else if (process.platform === 'linux') {
            execSync('sudo systemctl start docker', { stdio: 'inherit' })
          }
          s.stop('Docker daemon start command issued')
        } catch (err) {
          s.stop('Failed to start Docker daemon')
          throw err
        }
      },
      fixDescription: 'Start Docker daemon'
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
      },
      fix: async () => {
        const s = p.spinner()
        s.start('Starting PM2 process')
        try {
          execSync('pm2 start ecosystem.config.cjs', { cwd: installDir, stdio: 'inherit' })
          s.stop('PM2 process started')
        } catch (err) {
          s.stop('Failed to start PM2')
          throw err
        }
      },
      fixDescription: 'Start the PM2 process'
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

  interface CheckResult {
    check: Check
    status: 'pass' | 'fail' | 'warn'
    message?: string
  }

  const results: CheckResult[] = []

  for (const check of checks) {
    try {
      const result = check.check()
      if (result === true) {
        p.log.success(`${pc.green('PASS')} ${check.name}`)
        results.push({ check, status: 'pass' })
      } else if (result === false) {
        p.log.error(`${pc.red('FAIL')} ${check.name}`)
        if (check.fixDescription)
          p.log.info(`  → ${pc.dim(check.fixDescription)}`)

        results.push({ check, status: 'fail' })
      } else {
        p.log.warn(`${pc.yellow('WARN')} ${check.name}: ${result}`)
        results.push({ check, status: 'warn', message: result })
      }
    } catch {
      p.log.error(`${pc.red('FAIL')} ${check.name}`)
      if (check.fixDescription)
        p.log.info(`  → ${pc.dim(check.fixDescription)}`)

      results.push({ check, status: 'fail' })
    }
  }

  const passed = results.filter(r => r.status === 'pass').length
  const failed = results.filter(r => r.status === 'fail').length
  const fixableFailures = results.filter(r => r.status === 'fail' && r.check.fix)

  if (fixableFailures.length > 0) {
    p.log.info('')
    const runFixes = await p.confirm({
      message: `${fixableFailures.length} issue(s) can be auto-fixed. Run fixes now?`,
      initialValue: true
    })

    if (!p.isCancel(runFixes) && runFixes) {
      for (const { check } of fixableFailures) {
        if (!check.fix) continue

        p.log.step(pc.bold(`Fixing: ${check.name}`))
        try {
          await check.fix()

          // Re-check
          const result = check.check()
          if (result === true) {
            p.log.success(`${pc.green('✓')} ${check.name} is now fixed`)
          } else {
            p.log.warn(`${pc.yellow('!')} ${check.name} still failing after fix attempt`)
          }
        } catch (err) {
          p.log.error(`${pc.red('✗')} Failed to fix ${check.name}: ${err}`)
        }
      }
    }
  }

  p.outro(`${passed} passed, ${failed} failed`)
}
