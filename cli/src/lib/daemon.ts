import { execSync } from 'child_process'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { homedir, platform } from 'os'
import { join } from 'path'
import type { InitConfig } from './types'

export type DaemonPlatform = 'macos' | 'linux' | 'unsupported'
export type DaemonStatus = 'running' | 'stopped' | 'unknown'

export interface DaemonInfo {
  platform: DaemonPlatform
  serviceName: string
  configPath: string
  logsDir: string
}

/**
 * Get daemon platform and info
 */
export function getDaemonInfo(installDir: string): DaemonInfo {
  const plat = platform()
  const serviceName = 'com.cognova'

  if (plat === 'darwin') {
    return {
      platform: 'macos',
      serviceName,
      configPath: join(homedir(), 'Library', 'LaunchAgents', `${serviceName}.plist`),
      logsDir: join(installDir, 'logs')
    }
  }

  if (plat === 'linux') {
    return {
      platform: 'linux',
      serviceName: 'cognova',
      configPath: join(homedir(), '.config', 'systemd', 'user', 'cognova.service'),
      logsDir: join(installDir, 'logs')
    }
  }

  return {
    platform: 'unsupported',
    serviceName: 'cognova',
    configPath: '',
    logsDir: ''
  }
}

/**
 * Generate launchd plist for macOS
 */
export function generateLaunchdPlist(config: InitConfig): string {
  const nodePath = execSync('which node', { encoding: 'utf-8' }).trim()
  const serverPath = join(config.installDir, '.output', 'server', 'index.mjs')
  const logsDir = join(config.installDir, 'logs')

  // Load .env file and convert to plist format
  const envPath = join(config.installDir, '.env')
  let envVars = ''

  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8')
    const envLines = envContent.split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))

    envVars = envLines
      .map((line) => {
        const [key, ...valueParts] = line.split('=')
        const value = valueParts.join('=').replace(/^["']|["']$/g, '')
        return `    <key>${key}</key>\n    <string>${value}</string>`
      })
      .join('\n')
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.cognova</string>

  <key>ProgramArguments</key>
  <array>
    <string>${nodePath}</string>
    <string>${serverPath}</string>
  </array>

  <key>WorkingDirectory</key>
  <string>${config.installDir}</string>

  <key>EnvironmentVariables</key>
  <dict>
${envVars}
  </dict>

  <key>RunAtLoad</key>
  <true/>

  <key>KeepAlive</key>
  <true/>

  <key>StandardOutPath</key>
  <string>${logsDir}/stdout.log</string>

  <key>StandardErrorPath</key>
  <string>${logsDir}/stderr.log</string>
</dict>
</plist>
`
}

/**
 * Generate systemd unit for Linux
 */
export function generateSystemdUnit(config: InitConfig): string {
  const nodePath = execSync('which node', { encoding: 'utf-8' }).trim()
  const serverPath = join(config.installDir, '.output', 'server', 'index.mjs')
  const logsDir = join(config.installDir, 'logs')
  const envPath = join(config.installDir, '.env')

  return `[Unit]
Description=Cognova Personal Knowledge Assistant
After=network.target

[Service]
Type=simple
WorkingDirectory=${config.installDir}
ExecStart=${nodePath} ${serverPath}
Restart=always
RestartSec=10
StandardOutput=append:${logsDir}/stdout.log
StandardError=append:${logsDir}/stderr.log
Environment=NODE_ENV=production
EnvironmentFile=${envPath}

[Install]
WantedBy=default.target
`
}

/**
 * Install daemon (create config file)
 */
export function installDaemon(config: InitConfig): void {
  const info = getDaemonInfo(config.installDir)

  if (info.platform === 'unsupported') {
    throw new Error('Daemon installation not supported on this platform')
  }

  // Ensure logs directory exists
  if (!existsSync(info.logsDir)) {
    mkdirSync(info.logsDir, { recursive: true })
  }

  // Ensure config directory exists
  const configDir = join(info.configPath, '..')
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true })
  }

  // Generate and write config
  const configContent = info.platform === 'macos'
    ? generateLaunchdPlist(config)
    : generateSystemdUnit(config)

  writeFileSync(info.configPath, configContent, 'utf-8')

  // On Linux, reload systemd to pick up new unit
  if (info.platform === 'linux') {
    execSync('systemctl --user daemon-reload', { stdio: 'ignore' })
  }
}

/**
 * Start daemon
 */
export function startDaemon(installDir: string): void {
  const info = getDaemonInfo(installDir)

  if (info.platform === 'unsupported') {
    throw new Error('Daemon control not supported on this platform')
  }

  if (info.platform === 'macos') {
    // Load the LaunchAgent (starts it and enables auto-start on login)
    execSync(`launchctl load ${info.configPath}`, { stdio: 'inherit' })
  } else {
    // Start and enable systemd user service (auto-start on login)
    execSync('systemctl --user start cognova', { stdio: 'inherit' })
    execSync('systemctl --user enable cognova', { stdio: 'inherit' })
  }
}

/**
 * Stop daemon
 */
export function stopDaemon(installDir: string): void {
  const info = getDaemonInfo(installDir)

  if (info.platform === 'unsupported') {
    throw new Error('Daemon control not supported on this platform')
  }

  if (info.platform === 'macos') {
    execSync(`launchctl unload ${info.configPath}`, { stdio: 'inherit' })
  } else {
    execSync('systemctl --user stop cognova', { stdio: 'inherit' })
  }
}

/**
 * Restart daemon
 */
export function restartDaemon(installDir: string): void {
  const info = getDaemonInfo(installDir)

  if (info.platform === 'unsupported') {
    throw new Error('Daemon control not supported on this platform')
  }

  if (info.platform === 'macos') {
    // Unload and reload
    try {
      execSync(`launchctl unload ${info.configPath}`, { stdio: 'ignore' })
    } catch {
      // Ignore if not loaded
    }
    execSync(`launchctl load ${info.configPath}`, { stdio: 'inherit' })
  } else {
    execSync('systemctl --user restart cognova', { stdio: 'inherit' })
  }
}

/**
 * Get daemon status
 */
export function getDaemonStatus(installDir: string): DaemonStatus {
  const info = getDaemonInfo(installDir)

  if (info.platform === 'unsupported') {
    return 'unknown'
  }

  try {
    if (info.platform === 'macos') {
      const output = execSync('launchctl list', { encoding: 'utf-8' })
      return output.includes('com.cognova') ? 'running' : 'stopped'
    } else {
      const output = execSync('systemctl --user is-active cognova', { encoding: 'utf-8' })
      return output.trim() === 'active' ? 'running' : 'stopped'
    }
  } catch {
    return 'stopped'
  }
}

/**
 * Uninstall daemon (remove config file and stop service)
 */
export function uninstallDaemon(installDir: string): void {
  const info = getDaemonInfo(installDir)

  if (info.platform === 'unsupported') {
    return
  }

  // Stop if running
  try {
    stopDaemon(installDir)
  } catch {
    // Ignore if already stopped
  }

  // Remove config file
  if (existsSync(info.configPath)) {
    unlinkSync(info.configPath)
  }

  // On Linux, disable and reload
  if (info.platform === 'linux') {
    try {
      execSync('systemctl --user disable cognova', { stdio: 'ignore' })
      execSync('systemctl --user daemon-reload', { stdio: 'ignore' })
    } catch {
      // Ignore errors
    }
  }
}

/**
 * Get logs path for viewing
 */
export function getLogsPath(installDir: string): { stdout: string, stderr: string } {
  const logsDir = join(installDir, 'logs')
  return {
    stdout: join(logsDir, 'stdout.log'),
    stderr: join(logsDir, 'stderr.log')
  }
}
