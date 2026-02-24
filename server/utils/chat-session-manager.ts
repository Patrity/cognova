import { query } from '@anthropic-ai/claude-agent-sdk'
import type { SDKUserMessage } from '@anthropic-ai/claude-agent-sdk'
import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages/messages'
import { sdkEnv } from '~~/server/utils/sdk-env'

export type PromptInput = string | ContentBlockParam[]

interface ActiveSession {
  conversationId: string
  sdkSessionId: string
  conversation: ReturnType<typeof query>
  interrupted: boolean
  startedAt: Date
}

async function* createMultimodalPrompt(content: ContentBlockParam[]): AsyncGenerator<SDKUserMessage> {
  yield {
    type: 'user',
    message: { role: 'user', content },
    parent_tool_use_id: null,
    session_id: ''
  } as SDKUserMessage
}

class ChatSessionManager {
  private sessions = new Map<string, ActiveSession>()

  startSession(conversationId: string, prompt: PromptInput, resumeSessionId?: string): ActiveSession {
    // Use the project directory as CWD so the SDK picks up .claude/ (skills, rules, CLAUDE.md)
    // The vault is accessible via VAULT_PATH env var in tools
    const projectDir = process.env.COGNOVA_PROJECT_DIR || process.cwd()

    const promptArg = typeof prompt === 'string'
      ? prompt
      : createMultimodalPrompt(prompt)

    const conversation = query({
      prompt: promptArg,
      options: {
        cwd: projectDir,
        env: sdkEnv(),
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
