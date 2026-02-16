import type { InitConfig } from '../lib/types'

export function generatePm2Ecosystem(config: InitConfig): string {
  return `const { readFileSync } = require('fs')
const { join } = require('path')

// Load .env file into env vars for PM2
function loadEnv(dir) {
  try {
    const content = readFileSync(join(dir, '.env'), 'utf-8')
    const env = {}
    for (const line of content.split('\\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1)
    }
    return env
  } catch { return {} }
}

const dotenv = loadEnv('${config.installDir}')

module.exports = {
  apps: [{
    name: 'second-brain',
    script: '.output/server/index.mjs',
    cwd: '${config.installDir}',
    node_args: '--max-old-space-size=4096',
    env: {
      ...dotenv,
      NODE_ENV: 'production',
      PORT: 3000,
      SECOND_BRAIN_PROJECT_DIR: '${config.installDir}'
    },
    // Restart on crash
    autorestart: true,
    max_restarts: 10,
    restart_delay: 5000,
    // Logging
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '${config.installDir}/logs/error.log',
    out_file: '${config.installDir}/logs/out.log',
    merge_logs: true
  }]
}
`
}
