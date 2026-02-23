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
        const cmd = process.platform === 'linux' ? 'sudo npm install -g @anthropic-ai/claude-code' : 'npm install -g @anthropic-ai/claude-code'
        execSync(cmd, { stdio: 'inherit' })
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
  let hasDocker = !!dockerOut
  if (dockerOut) {
    p.log.success(`Docker available ${pc.dim('(for local PostgreSQL)')}`)
  } else {
    const installDocker = await p.confirm({
      message: 'Docker not found. Install it? (needed only for local PostgreSQL)',
      initialValue: false
    })
    if (!p.isCancel(installDocker) && installDocker) {
      const s = p.spinner()
      s.start('Installing Docker')
      try {
        if (process.platform === 'darwin') {
          execSync('brew install --cask docker', { stdio: 'inherit' })
          s.stop('Docker Desktop installed — open it from Applications to finish setup')
        } else {
          const cmd = process.platform === 'linux' ? 'sudo apt-get update -qq && sudo apt-get install -y -qq docker.io docker-compose-plugin' : 'apt-get update -qq && apt-get install -y -qq docker.io docker-compose-plugin'
          execSync(cmd, { stdio: 'inherit' })
          s.stop('Docker installed')
        }
        hasDocker = !!checkCommand('docker --version')
      } catch {
        s.stop('Docker installation failed')
        p.log.warn('Install Docker manually: https://docs.docker.com/get-docker/')
      }
    } else {
      p.log.info(`Skipped — you can use a remote PostgreSQL instead`)
    }
  }

  return {
    ok: true,
    hasDocker,
    nodeVersion: nodeOut || '',
    pythonVersion: pythonOut || '',
    pnpmVersion: pnpmOut || '',
    claudeInstalled: !!claudeOut
  }
}
