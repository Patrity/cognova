import { execSync } from 'child_process'
import * as p from '@clack/prompts'
import pc from 'picocolors'

export interface PrereqResult {
  ok: boolean
  hasDocker: boolean
  nodeVersion: string
  pythonVersion: string
  pnpmVersion: string
  claudeInstalled: boolean
}

function checkCommand(cmd: string): string | null {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
  } catch {
    return null
  }
}

export async function checkPrerequisites(): Promise<PrereqResult> {
  p.log.step('Checking prerequisites...')

  const nodeOut = checkCommand('node --version')
  const pythonOut = checkCommand('python3 --version')
  const pnpmOut = checkCommand('pnpm --version')
  let claudeOut = checkCommand('claude --version')
  const dockerOut = checkCommand('docker --version')

  // Validate Node >= 22
  const nodeMajor = nodeOut ? parseInt(nodeOut.replace('v', '')) : 0
  if (nodeMajor < 22) {
    p.log.error(`Node.js >= 22 required (found: ${nodeOut || 'not installed'})`)
    p.log.info('Install from https://nodejs.org/')
    process.exit(1)
  }
  p.log.success(`Node.js ${nodeOut}`)

  // Check Python 3
  if (!pythonOut) {
    p.log.error('Python 3 is required (used by skills and hooks)')
    p.log.info('Install from https://python.org/')
    process.exit(1)
  }
  p.log.success(`${pythonOut}`)

  // Check pnpm
  if (!pnpmOut) {
    p.log.error('pnpm is required')
    p.log.info('Install with: npm install -g pnpm')
    process.exit(1)
  }
  p.log.success(`pnpm ${pnpmOut}`)

  // Claude Code CLI
  if (!claudeOut) {
    const install = await p.confirm({
      message: 'Claude Code CLI not found. Install it now?'
    })
    if (p.isCancel(install)) process.exit(0)

    if (install) {
      const s = p.spinner()
      s.start('Installing Claude Code CLI')
      try {
        execSync('npm install -g @anthropic-ai/claude-code', { stdio: 'pipe' })
        claudeOut = checkCommand('claude --version')
        s.stop(`Claude Code installed (${claudeOut})`)
      } catch {
        s.stop('Installation failed')
        p.log.warn('Claude Code could not be installed. Install manually: npm install -g @anthropic-ai/claude-code')
      }
    } else {
      p.log.warn('Claude Code CLI not installed — terminal features will be limited')
    }
  } else {
    p.log.success(`Claude Code ${claudeOut}`)
  }

  // Docker (optional)
  if (dockerOut) {
    p.log.success(`Docker available ${pc.dim('(for local PostgreSQL)')}`)
  } else {
    p.log.info(`Docker not found ${pc.dim('(needed only for local PostgreSQL)')}`)
  }

  return {
    ok: true,
    hasDocker: !!dockerOut,
    nodeVersion: nodeOut || '',
    pythonVersion: pythonOut || '',
    pnpmVersion: pnpmOut || '',
    claudeInstalled: !!claudeOut
  }
}
