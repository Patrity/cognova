import { execSync } from 'child_process'
import * as p from '@clack/prompts'
import pc from 'picocolors'

export interface PrereqResult {
  ok: boolean
  dockerInstalled: boolean
  dockerReady: boolean
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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
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
  let dockerInstalled = !!dockerOut
  let dockerReady = false

  if (dockerOut) {
    // Docker CLI is installed, check if daemon is running
    const daemonRunning = checkCommand('docker info')
    if (daemonRunning) {
      dockerReady = true
      p.log.success(`Docker available ${pc.dim('(for local PostgreSQL)')}`)
    } else {
      p.log.warn('Docker is installed but the daemon is not running')
      const startDocker = await p.confirm({
        message: 'Start Docker now?',
        initialValue: true
      })
      if (!p.isCancel(startDocker) && startDocker) {
        const s = p.spinner()
        s.start('Starting Docker daemon')
        try {
          if (process.platform === 'darwin') {
            execSync('open -a Docker', { stdio: 'pipe' })
          } else if (process.platform === 'linux') {
            execSync('sudo systemctl start docker', { stdio: 'inherit' })
          }

          // Poll for daemon to be ready (30 second timeout)
          for (let i = 0; i < 30; i++) {
            await sleep(1000)
            if (checkCommand('docker info')) {
              dockerReady = true
              s.stop('Docker daemon is running')
              break
            }
          }

          if (!dockerReady) {
            s.stop('Docker daemon did not start in time')
            p.log.warn('You can start it manually and continue with local PostgreSQL, or use remote PostgreSQL')
          }
        } catch {
          s.stop('Failed to start Docker daemon')
          p.log.warn('Start Docker manually: https://docs.docker.com/get-docker/')
        }
      } else {
        p.log.info('You can use a remote PostgreSQL instead')
      }
    }
  } else {
    // Docker not installed
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
          p.log.info('Open Docker Desktop from Applications, then re-run this installer')
        } else {
          const cmd = process.platform === 'linux' ? 'sudo apt-get update -qq && sudo apt-get install -y -qq docker.io docker-compose-plugin' : 'apt-get update -qq && apt-get install -y -qq docker.io docker-compose-plugin'
          execSync(cmd, { stdio: 'inherit' })
          s.stop('Docker installed')
        }
        dockerInstalled = !!checkCommand('docker --version')
        dockerReady = !!checkCommand('docker info')
      } catch {
        s.stop('Docker installation failed')
        p.log.warn('Install Docker manually: https://docs.docker.com/get-docker/')
      }
    } else {
      p.log.info('Skipped — you can use a remote PostgreSQL instead')
    }
  }

  return {
    ok: true,
    dockerInstalled,
    dockerReady,
    nodeVersion: nodeOut || '',
    pythonVersion: pythonOut || '',
    pnpmVersion: pnpmOut || '',
    claudeInstalled: !!claudeOut
  }
}
