import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { init } from './commands/init'
import { start, stop, restart } from './commands/start'
import { update } from './commands/update'
import { doctor } from './commands/doctor'
import { reset } from './commands/reset'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function getVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8'))
    return pkg.version || '0.0.0'
  } catch {
    return '0.0.0'
  }
}

const HELP_TEXT = `
  second-brain v${getVersion()} — Personal knowledge management with Claude Code

  Usage: second-brain <command> [options]

  Commands:
    init      Interactive setup wizard
    start     Start Second Brain (PM2)
    stop      Stop Second Brain
    restart   Restart Second Brain
    update    Update to latest version
    doctor    Check health of all components
    reset     Re-generate configuration files

  Options:
    --help, -h       Show this help message
    --version, -v    Show version number

  Run 'second-brain <command> --help' for command-specific help.
`

const COMMAND_HELP: Record<string, string> = {
  init: `
  second-brain init — Interactive setup wizard

  Sets up a new Second Brain installation:
    1. Checks prerequisites (Node 22+, Python 3, pnpm, Docker)
    2. Configures agent personality (name, tone, traits)
    3. Chooses install directory
    4. Sets up vault (PARA folder structure)
    5. Configures database (local Docker or remote PostgreSQL)
    6. Sets network access mode
    7. Creates admin credentials
    8. Installs dependencies, builds, and starts with PM2

  Usage: second-brain init
`,
  start: `
  second-brain start — Start Second Brain

  Starts the application using PM2 process manager.
  Requires a prior 'second-brain init' to have been run.

  Usage: second-brain start
`,
  stop: `
  second-brain stop — Stop Second Brain

  Stops the PM2 process. Data and configuration are preserved.

  Usage: second-brain stop
`,
  restart: `
  second-brain restart — Restart Second Brain

  Restarts the PM2 process. Useful after manual config changes.

  Usage: second-brain restart
`,
  update: `
  second-brain update — Update to latest version

  Checks npm registry for a newer version, downloads and installs it.
  Preserves: .env, .api-token, ecosystem.config.cjs, logs/
  Runs database migrations and rebuilds automatically.
  Creates a backup before updating so failed updates can be rolled back.

  Usage: second-brain update
`,
  doctor: `
  second-brain doctor — Check health of all components

  Runs diagnostic checks on your installation:
    - Configuration files (.env, Claude config)
    - Dependencies (Node, Python, Claude Code CLI)
    - Build output
    - PM2 process status
    - App health endpoint
    - Database connection
    - Vault directory
    - Version status

  Usage: second-brain doctor
`,
  reset: `
  second-brain reset — Re-generate configuration files

  Interactively choose which config files to regenerate:
    - CLAUDE.md (agent identity — re-runs personality prompts)
    - Skills, Hooks, Rules (re-copy from bundled defaults)
    - settings.json (Claude Code hook configuration)

  Usage: second-brain reset
`
}

const args = process.argv.slice(2)
const command = args.find(a => !a.startsWith('-'))
const flags = new Set(args.filter(a => a.startsWith('-')))

// --version / -v
if (flags.has('--version') || flags.has('-v')) {
  console.log(getVersion())
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
