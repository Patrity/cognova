import { init } from './commands/init'
import { start, stop, restart, status, logs } from './commands/start'
import { update } from './commands/update'
import { doctor } from './commands/doctor'
import { reset } from './commands/reset'
import { getPackageVersion, readMetadata } from './lib/paths'

// Prefer the installed app version (kept current by `cognova update`) over the
// CLI binary's own package.json, which only changes when npm updates the global install.
const displayVersion = readMetadata()?.version || getPackageVersion()

const HELP_TEXT = `
  cognova v${displayVersion} — Personal knowledge management with Claude Code

  Usage: cognova <command> [options]

  Commands:
    init      Interactive setup wizard
    start     Start Cognova
    stop      Stop Cognova
    restart   Restart Cognova
    status    Check service status
    logs      View application logs
    update    Update to latest version
    doctor    Check health of all components
    reset     Re-generate configuration files

  Options:
    --help, -h       Show this help message
    --version, -v    Show version number

  Run 'cognova <command> --help' for command-specific help.
`

const COMMAND_HELP: Record<string, string> = {
  init: `
  cognova init — Interactive setup wizard

  Sets up a new Cognova installation:
    1. Checks prerequisites (Node 22+, Python 3, pnpm, Docker)
    2. Configures agent personality (name, tone, traits)
    3. Chooses install directory
    4. Sets up vault (PARA folder structure)
    5. Configures database (local Docker or remote PostgreSQL)
    6. Sets network access mode
    7. Creates admin credentials
    8. Installs dependencies, builds, and starts as system service

  Usage: cognova init
`,
  start: `
  cognova start — Start Cognova

  Starts the application as a system service (launchd on macOS, systemd on Linux).
  Requires a prior 'cognova init' to have been run.

  Usage: cognova start
`,
  stop: `
  cognova stop — Stop Cognova

  Stops the service. Data and configuration are preserved.

  Usage: cognova stop
`,
  restart: `
  cognova restart — Restart Cognova

  Restarts the service. Useful after manual config changes.

  Usage: cognova restart
`,
  status: `
  cognova status — Check service status

  Shows whether Cognova is running and service configuration details.

  Usage: cognova status
`,
  logs: `
  cognova logs — View application logs

  Streams application logs in real-time (stderr).
  Press Ctrl+C to exit.

  Usage: cognova logs
`,
  update: `
  cognova update — Update to latest version

  Checks npm registry for a newer version, downloads and installs it.
  Preserves: .env, .api-token, service config, logs/
  Runs database migrations and rebuilds automatically.
  Creates a backup before updating so failed updates can be rolled back.

  Usage: cognova update [--channel <name>]

  Options:
    --channel <name>   Install from a specific npm dist-tag (e.g. 'next').
                       Omit or use 'latest' to switch back to stable releases.

  Examples:
    cognova update                    Update to latest stable
    cognova update --channel next     Switch to pre-release channel
    cognova update                    Switch back to stable from any channel
`,
  doctor: `
  cognova doctor — Check health of all components

  Runs diagnostic checks on your installation:
    - Configuration files (.env, Claude config)
    - Dependencies (Node, Python, Claude Code CLI)
    - Build output
    - Service status (launchd/systemd)
    - App health endpoint
    - Database connection
    - Vault directory
    - Version status

  Usage: cognova doctor
`,
  reset: `
  cognova reset — Re-generate configuration files

  Interactively choose which config files to regenerate:
    - CLAUDE.md (agent identity — re-runs personality prompts)
    - Skills, Hooks, Rules (re-copy from bundled defaults)
    - settings.json (Claude Code hook configuration)

  Usage: cognova reset
`
}

const args = process.argv.slice(2)
const command = args.find(a => !a.startsWith('-'))
const flags = new Set(args.filter(a => a.startsWith('-')))

// --version / -v
if (flags.has('--version') || flags.has('-v')) {
  console.log(displayVersion)
  process.exit(0)
}

// --help / -h (root or command-level)
if (flags.has('--help') || flags.has('-h')) {
  if (command && COMMAND_HELP[command]) {
    console.log(COMMAND_HELP[command])
  } else {
    console.log(HELP_TEXT)
  }
  process.exit(0)
}

const commands: Record<string, () => Promise<void>> = {
  init,
  start,
  stop,
  restart,
  status,
  logs,
  update,
  doctor,
  reset
}

const handler = commands[command || '']
if (!handler) {
  console.log(HELP_TEXT)
  process.exit(command ? 1 : 0)
}

handler().catch((err: Error) => {
  console.error(err.message)
  process.exit(1)
})
