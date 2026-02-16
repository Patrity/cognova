import { init } from './commands/init'
import { start, stop, restart } from './commands/start'
import { update } from './commands/update'
import { doctor } from './commands/doctor'
import { reset } from './commands/reset'

const command = process.argv[2]

const commands: Record<string, () => Promise<void>> = {
  init,
  start,
  stop,
  restart,
  update,
  doctor,
  reset
}

const handler = commands[command]
if (!handler) {
  console.log(`
  second-brain - Personal knowledge management with Claude Code

  Usage: second-brain <command>

  Commands:
    init      Interactive setup wizard
    start     Start Second Brain (PM2)
    stop      Stop Second Brain
    restart   Restart Second Brain
    update    Update to latest version
    doctor    Check health of all components
    reset     Re-generate configuration files
`)
  process.exit(command ? 1 : 0)
}

handler().catch((err: Error) => {
  console.error(err.message)
  process.exit(1)
})
