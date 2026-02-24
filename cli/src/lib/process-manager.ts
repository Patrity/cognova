import { execSync } from 'child_process'
import * as p from '@clack/prompts'
import { installDaemon, startDaemon, getDaemonInfo } from './daemon'
import type { InitConfig } from './types'

export async function setupAndStart(config: InitConfig) {
  const info = getDaemonInfo(config.installDir)

  if (info.platform === 'unsupported') {
    p.log.warn('Native daemon management not supported on this platform')
    p.log.info('Start manually with: node .output/server/index.mjs')
    return
  }

  const s = p.spinner()

  // Build the application
  s.start('Building application')
  try {
    execSync('pnpm build', { cwd: config.installDir, stdio: 'pipe' })
    s.stop('Application built')
  } catch (err) {
    s.stop('Build failed')
    p.log.error(`Build error: ${err}`)
    throw err
  }

  // Install daemon configuration
  s.start(`Installing ${info.platform === 'macos' ? 'launchd' : 'systemd'} service`)
  try {
    installDaemon(config)
    s.stop(`Service configuration installed`)
  } catch (err) {
    s.stop('Service installation failed')
    p.log.error(`Installation error: ${err}`)
    throw err
  }

  // Start the daemon
  s.start('Starting Cognova')
  try {
    startDaemon(config.installDir)
    s.stop('Cognova is running')

    // Show service info
    if (info.platform === 'macos') {
      p.log.info('Service: ~/Library/LaunchAgents/com.cognova.plist')
      p.log.info('Auto-start: Enabled (will start on login)')
    } else {
      p.log.info('Service: ~/.config/systemd/user/cognova.service')
      p.log.info('Auto-start: Enabled (will start on login)')
    }
  } catch (err) {
    s.stop('Failed to start')
    p.log.error(`Start error: ${err}`)

    if (info.platform === 'macos') {
      p.log.info('Troubleshoot: launchctl list | grep cognova')
      p.log.info(`View logs: tail -f ${info.logsDir}/stderr.log`)
    } else {
      p.log.info('Troubleshoot: systemctl --user status cognova')
      p.log.info(`View logs: journalctl --user -u cognova -f`)
    }

    throw err
  }
}
