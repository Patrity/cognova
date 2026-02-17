import type { InitConfig } from '../lib/types'

export function generateSettingsJson(config: InitConfig): string {
  const settings = {
    hooks: {
      SessionStart: [{
        hooks: [
          { type: 'command', command: 'python3 ~/.claude/hooks/session-start.py' }
        ]
      }],
      PreCompact: [{
        hooks: [
          { type: 'command', command: 'python3 ~/.claude/hooks/pre-compact.py' }
        ]
      }],
      Stop: [{
        hooks: [
          { type: 'command', command: 'python3 ~/.claude/hooks/stop-extract.py', timeout: 60000 }
        ]
      }],
      SessionEnd: [{
        hooks: [
          { type: 'command', command: 'python3 ~/.claude/hooks/session-end.py' }
        ]
      }],
      PreToolUse: [
        {
          matcher: 'Edit|Write|NotebookEdit',
          hooks: [
            { type: 'command', command: 'python3 ~/.claude/hooks/log-event.py PreToolUse' }
          ]
        },
        {
          matcher: 'Bash',
          hooks: [
            { type: 'command', command: 'python3 ~/.claude/hooks/log-event.py PreToolUse' }
          ]
        }
      ],
      PostToolUse: [{
        matcher: '',
        hooks: [
          { type: 'command', command: 'python3 ~/.claude/hooks/log-event.py PostToolUse' }
        ]
      }]
    },
    env: {
      COGNOVA_API_URL: config.appUrl,
      COGNOVA_PROJECT_DIR: config.installDir
    }
  }

  return JSON.stringify(settings, null, 2) + '\n'
}
