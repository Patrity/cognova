import { query } from '@anthropic-ai/claude-agent-sdk'
import { eq } from 'drizzle-orm'
import { getDb } from '../db'
import * as schema from '../db/schema'

export interface AgentConfig {
  id: string
  name: string
  prompt: string
  maxTurns?: number
  maxBudgetUsd?: number | null
}

// Result type matching SDK structure
interface AgentResult {
  subtype: string
  total_cost_usd: number
  num_turns: number
  result?: string
  errors?: string[]
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

export async function executeAgent(config: AgentConfig): Promise<void> {
  const db = getDb()
  const startTime = Date.now()

  // Create run record
  const [run] = await db.insert(schema.cronAgentRuns)
    .values({ agentId: config.id, status: 'running' })
    .returning()

  try {
    const result = await runAgentSDK(config)
    const durationMs = Date.now() - startTime

    // Determine status based on result subtype
    const status = result.subtype === 'success'
      ? 'success'
      : result.subtype === 'error_max_budget_usd'
        ? 'budget_exceeded'
        : 'error'

    // Update run record with full metrics
    await db.update(schema.cronAgentRuns)
      .set({
        status,
        output: result.subtype === 'success' ? result.result : undefined,
        error: result.subtype !== 'success' ? result.errors?.join('\n') : undefined,
        costUsd: result.total_cost_usd,
        inputTokens: result.usage.input_tokens,
        outputTokens: result.usage.output_tokens,
        numTurns: result.num_turns,
        completedAt: new Date(),
        durationMs
      })
      .where(eq(schema.cronAgentRuns.id, run!.id))

    // Update agent last run
    await db.update(schema.cronAgents)
      .set({ lastRunAt: new Date(), lastStatus: status })
      .where(eq(schema.cronAgents.id, config.id))

    console.log(`[agent] ${config.name} completed: ${status} (${durationMs}ms, $${result.total_cost_usd.toFixed(4)})`)
    // TODO: Send Gotify notification
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    await db.update(schema.cronAgentRuns)
      .set({
        status: 'error',
        error: errorMessage,
        completedAt: new Date(),
        durationMs: Date.now() - startTime
      })
      .where(eq(schema.cronAgentRuns.id, run!.id))

    await db.update(schema.cronAgents)
      .set({ lastRunAt: new Date(), lastStatus: 'error' })
      .where(eq(schema.cronAgents.id, config.id))

    console.error(`[agent] ${config.name} failed:`, errorMessage)

    // TODO: Send Gotify notification (high priority)
  }
}

async function runAgentSDK(config: AgentConfig): Promise<AgentResult> {
  // SDK checks CLAUDE_CODE_OAUTH_TOKEN first (Max subscription),
  // then falls back to ANTHROPIC_API_KEY (API billing)
  const conversation = query({
    prompt: config.prompt,
    options: {
      cwd: process.env.VAULT_PATH || process.cwd(),
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: config.maxTurns ?? 50,
      maxBudgetUsd: config.maxBudgetUsd ?? undefined
    }
  })

  let resultMessage: AgentResult | undefined

  // Stream through messages and collect output
  for await (const message of conversation) {
    if (message.type === 'result') {
      // Extract the fields we need from the SDK result
      // Cast through unknown as SDK types don't expose usage properties correctly
      const msg = message as unknown as {
        subtype: string
        total_cost_usd: number
        num_turns: number
        result?: string
        errors?: string[]
        usage: { input_tokens: number, output_tokens: number }
      }
      resultMessage = {
        subtype: msg.subtype,
        total_cost_usd: msg.total_cost_usd,
        num_turns: msg.num_turns,
        result: msg.result,
        errors: msg.errors,
        usage: {
          input_tokens: msg.usage.input_tokens,
          output_tokens: msg.usage.output_tokens
        }
      }
    }
  }

  if (!resultMessage) {
    throw new Error('No result message received from SDK')
  }

  return resultMessage
}
