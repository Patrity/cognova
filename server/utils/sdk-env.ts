import { dirname } from 'path'

/**
 * Build env vars for Claude Agent SDK child processes.
 * Ensures the `node` binary is findable even when the server
 * runs under launchctl/systemd where nvm/fnm aren't in PATH.
 */
export function sdkEnv(): Record<string, string | undefined> {
  const nodeDir = dirname(process.execPath)
  const currentPath = process.env.PATH || ''

  return {
    ...process.env,
    PATH: currentPath.includes(nodeDir)
      ? currentPath
      : `${nodeDir}:${currentPath}`
  }
}
