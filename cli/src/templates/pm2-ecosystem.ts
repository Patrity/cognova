import type { InitConfig } from '../lib/types'

export function generatePm2Ecosystem(config: InitConfig): string {
  return `module.exports = {
  apps: [{
    name: 'second-brain',
    script: '.output/server/index.mjs',
    cwd: '${config.installDir}',
    node_args: '--max-old-space-size=4096',
    env: {
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
