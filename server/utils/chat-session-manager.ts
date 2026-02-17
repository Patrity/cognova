import { query } from '@anthropic-ai/claude-agent-sdk'

interface ActiveSession {
  conversationId: string
  sdkSessionId: string
  conversation: ReturnType<typeof query>
  interrupted: boolean
  startedAt: Date
}

class ChatSessionManager {
  private sessions = new Map<string, ActiveSession>()

  startSession(conversationId: string, prompt: string, resumeSessionId?: string): ActiveSession {
    // Use the project directory as CWD so the SDK picks up .claude/ (skills, rules, CLAUDE.md)
    // The vault is accessible via VAULT_PATH env var in tools
    const projectDir = process.env.COGNOVA_PROJECT_DIR || process.cwd()
    const conversation = query({
      prompt,
      options: {
        cwd: projectDir,
        settingSources: ['user', 'project'],
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        maxTurns: 200,
        includePartialMessages: true,
        ...(resumeSessionId ? { resume: resumeSessionId } : {})
      }
    })

    const session: ActiveSession = {
      conversationId,
      sdkSessionId: '',
      conversation,
      interrupted: false,
      startedAt: new Date()
    }

    this.sessions.set(conversationId, session)
    return session
  }

  getSession(conversationId: string): ActiveSession | undefined {
    return this.sessions.get(conversationId)
  }

  interrupt(conversationId: string): boolean {
    const session = this.sessions.get(conversationId)
    if (!session) return false
    session.interrupted = true
    return true
  }

  removeSession(conversationId: string): void {
    this.sessions.delete(conversationId)
  }
}

export const chatSessionManager = new ChatSessionManager()
