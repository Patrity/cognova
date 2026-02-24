import { existsSync } from 'fs'
import { findInstallDir } from '../lib/paths'
import { startDaemon, stopDaemon, restartDaemon, getDaemonStatus, getDaemonInfo, getLogsPath } from '../lib/daemon'
import { execSync } from 'child_process'

export async function start() {
  const installDir = findInstallDir()
  const info = getDaemonInfo(installDir)

  if (!existsSync(info.configPath)) {
    console.error(`No ${info.platform === 'macos' ? 'launchd plist' : 'systemd unit'} found. Run \`cognova init\` first.`)
    process.exit(1)
  }

  try {
    startDaemon(installDir)
    console.log('Cognova started.')
  } catch (err) {
    console.error('Failed to start:', err)
    process.exit(1)
  }
}

export async function stop() {
  try {
    const installDir = findInstallDir()
    stopDaemon(installDir)
    console.log('Cognova stopped.')
  } catch {
    console.error('Failed to stop. Is Cognova running?')
    process.exit(1)
  }
}

export async function restart() {
  try {
    const installDir = findInstallDir()
    restartDaemon(installDir)
    console.log('Cognova restarted.')
  } catch {
    console.error('Failed to restart. Is Cognova running?')
    process.exit(1)
  }
}

export async function status() {
  try {
    const installDir = findInstallDir()
    const daemonStatus = getDaemonStatus(installDir)
    const info = getDaemonInfo(installDir)

    console.log(`Status: ${daemonStatus}`)

    if (daemonStatus === 'running') {
      console.log(`Platform: ${info.platform}`)
      console.log(`Config: ${info.configPath}`)
    } else {
      console.log('Cognova is not running. Start with: cognova start')
    }
  } catch (err) {
    console.error('Failed to check status:', err)
    process.exit(1)
  }
}

export async function logs() {
  try {
    const installDir = findInstallDir()
    const info = getDaemonInfo(installDir)
    const logPaths = getLogsPath(installDir)

    console.log('Showing stderr log (Ctrl+C to exit)...\n')

    if (info.platform === 'macos') {
      // Use tail -f for macOS logs
      execSync(`tail -f ${logPaths.stderr}`, { stdio: 'inherit' })
    } else {
      // Use journalctl for Linux systemd logs
      execSync('journalctl --user -u cognova -f', { stdio: 'inherit' })
    }
  } catch (err) {
    console.error('Failed to show logs:', err)
    process.exit(1)
  }
}
